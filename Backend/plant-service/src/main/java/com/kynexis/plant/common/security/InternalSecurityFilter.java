package com.kynexis.plant.common.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.kynexis.plant.common.logging.LoggingConstants;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class InternalSecurityFilter extends OncePerRequestFilter {

    public static final String DEFAULT_INTERNAL_SECRET = "KynexisInternalServiceCommunicationSecretKey2026";

    private final String expectedInternalSecret;

    public InternalSecurityFilter(
            @Value("${kynexis.security.internal-secret:" + DEFAULT_INTERNAL_SECRET + "}") String expectedInternalSecret) {
        this.expectedInternalSecret = (expectedInternalSecret != null && !expectedInternalSecret.isBlank())
                ? expectedInternalSecret : DEFAULT_INTERNAL_SECRET;
    }

    public InternalSecurityFilter() {
        this(DEFAULT_INTERNAL_SECRET);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String internalSecretHeader = request.getHeader(LoggingConstants.INTERNAL_SECRET_HEADER);
        boolean hasValidInternalSecret = internalSecretHeader != null
                && MessageDigest.isEqual(
                        internalSecretHeader.getBytes(StandardCharsets.UTF_8),
                        expectedInternalSecret.getBytes(StandardCharsets.UTF_8));

        String propagatedUserId = request.getHeader(LoggingConstants.USER_ID_HEADER);
        String propagatedRoles = request.getHeader(LoggingConstants.USER_ROLES_HEADER);

        if (hasValidInternalSecret) {
            if (propagatedUserId != null && !propagatedUserId.isBlank()) {
                List<SimpleGrantedAuthority> authorities = Collections.emptyList();
                if (propagatedRoles != null && !propagatedRoles.isBlank()) {
                    authorities = Arrays.stream(propagatedRoles.split(","))
                            .map(String::trim)
                            .filter(r -> !r.isEmpty())
                            .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                            .map(SimpleGrantedAuthority::new)
                            .collect(Collectors.toList());
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(propagatedUserId, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
                filterChain.doFilter(request, response);
                return;
            } else {
                // Inter-service machine-to-machine call with valid secret
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken("internal-service", null,
                                List.of(new SimpleGrantedAuthority("ROLE_INTERNAL_SERVICE"), new SimpleGrantedAuthority("ROLE_ADMIN")));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                filterChain.doFilter(request, response);
                return;
            }
        } else if (propagatedUserId != null || propagatedRoles != null) {
            log.warn("Security Alert: Blocked untrusted identity headers from unauthenticated caller: uri={}", request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }
}
