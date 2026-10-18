package com.kynexis.energy.common.security;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class InternalSecurityFilter extends OncePerRequestFilter {

    private final String internalSecret;

    public InternalSecurityFilter(
            @Value("${kynexis.security.internal-secret:KynexisInternalServiceCommunicationSecretKey2026}") String internalSecret) {
        this.internalSecret = internalSecret;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String secretHeader = request.getHeader("X-Internal-Secret");
        String userHeader = request.getHeader("X-Authenticated-User");
        String roleHeader = request.getHeader("X-Authenticated-Role");

        if (internalSecret != null && internalSecret.equals(secretHeader)) {
            String role = roleHeader != null && !roleHeader.isBlank() ? roleHeader : "ADMIN";
            String principal = userHeader != null && !userHeader.isBlank() ? userHeader : "internal-system";

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
