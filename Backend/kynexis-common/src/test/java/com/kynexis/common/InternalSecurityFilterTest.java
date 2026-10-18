package com.kynexis.common;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.kynexis.common.logging.LoggingConstants;
import com.kynexis.common.security.InternalSecurityFilter;
import com.kynexis.common.security.JwtService;

import jakarta.servlet.ServletException;

class InternalSecurityFilterTest {

    private JwtService jwtService;
    private InternalSecurityFilter filter;
    private static final String SECRET = "TestInternalSecretKey12345678901234567890";

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtService = mock(JwtService.class);
        filter = new InternalSecurityFilter(jwtService, SECRET);
    }

    @Test
    @DisplayName("Should authenticate user when valid internal secret and user headers are present")
    void shouldAuthenticateUserWithValidInternalSecret() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(LoggingConstants.INTERNAL_SECRET_HEADER, SECRET);
        request.addHeader(LoggingConstants.USER_ID_HEADER, "operator1");
        request.addHeader(LoggingConstants.USER_ROLES_HEADER, "OPERATOR,ENGINEER");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("operator1", auth.getPrincipal());
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OPERATOR")));
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ENGINEER")));
    }

    @Test
    @DisplayName("Should authenticate as internal service when secret is valid but no user headers present")
    void shouldAuthenticateInternalServiceWithSecretOnly() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(LoggingConstants.INTERNAL_SECRET_HEADER, SECRET);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("internal-service", auth.getPrincipal());
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_INTERNAL_SERVICE")));
    }

    @Test
    @DisplayName("Should reject and block spoofed user headers when internal secret is missing or invalid")
    void shouldRejectSpoofedHeadersWithoutValidSecret() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(LoggingConstants.INTERNAL_SECRET_HEADER, "wrong-secret");
        request.addHeader(LoggingConstants.USER_ID_HEADER, "attacker");
        request.addHeader(LoggingConstants.USER_ROLES_HEADER, "ROLE_ADMIN");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNull(auth, "Authentication must be null when attacker attempts to spoof identity without valid secret");
    }

    @Test
    @DisplayName("Should authenticate via direct Bearer JWT when valid token is provided")
    void shouldAuthenticateViaDirectBearerToken() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer valid.test.token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        when(jwtService.isTokenValid("valid.test.token")).thenReturn(true);
        when(jwtService.extractUsername("valid.test.token")).thenReturn("admin_user");
        when(jwtService.extractRole("valid.test.token")).thenReturn("ADMIN");

        filter.doFilter(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("admin_user", auth.getPrincipal());
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }
}
