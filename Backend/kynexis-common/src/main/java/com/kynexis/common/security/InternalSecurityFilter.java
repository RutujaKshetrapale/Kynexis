package com.kynexis.common.security;

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

import com.kynexis.common.logging.LoggingConstants;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * Security filter for microservices.
 * Supports authentication via:
 * 1. Authenticated gateway / inter-service communication with verified X-Internal-Secret
 *    (prevents external callers from spoofing X-User-Id / X-User-Roles)
 * 2. Direct Bearer JWT token (via JwtService)
 */
@Slf4j
@Component
public class InternalSecurityFilter extends OncePerRequestFilter {

    public static final String DEFAULT_INTERNAL_SECRET = "KynexisInternalServiceCommunicationSecretKey2026";

    private final JwtService jwtService;
    private final String expectedInternalSecret;

    public InternalSecurityFilter(
            JwtService jwtService,
            @Value("${kynexis.security.internal-secret:" + DEFAULT_INTERNAL_SECRET + "}") String expectedInternalSecret) {
        this.jwtService = jwtService;
        this.expectedInternalSecret = (expectedInternalSecret != null && !expectedInternalSecret.isBlank())
                ? expectedInternalSecret : DEFAULT_INTERNAL_SECRET;
    }

    public InternalSecurityFilter(JwtService jwtService) {
        this(jwtService, DEFAULT_INTERNAL_SECRET);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // 1. Verify internal secret for trusted service-to-service communication
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

        // 2. Direct Bearer JWT token (standalone, direct testing, or public endpoints)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtService.isTokenValid(token)) {
                String username = jwtService.extractUsername(token);
                String role = jwtService.extractRole(token);

                String roleWithPrefix = (role != null && role.startsWith("ROLE_")) ? role : "ROLE_" + role;
                List<SimpleGrantedAuthority> authorities = (role != null)
                        ? List.of(new SimpleGrantedAuthority(roleWithPrefix))
                        : Collections.emptyList();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(username, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }
}
