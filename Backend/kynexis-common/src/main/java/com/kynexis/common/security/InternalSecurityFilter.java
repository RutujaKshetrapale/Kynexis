package com.kynexis.common.security;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

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
 * 1. Propagated gateway headers (X-User-Id, X-User-Roles)
 * 2. Direct Bearer JWT token (via JwtService)
 */
@Slf4j
@Component
public class InternalSecurityFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public InternalSecurityFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // 1. Check for propagated identity headers from API Gateway
        String propagatedUserId = request.getHeader(LoggingConstants.USER_ID_HEADER);
        String propagatedRoles = request.getHeader(LoggingConstants.USER_ROLES_HEADER);

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
        }

        // 2. Check for direct Bearer JWT token (standalone or direct testing)
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
