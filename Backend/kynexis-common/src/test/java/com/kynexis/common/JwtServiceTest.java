package com.kynexis.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.kynexis.common.security.JwtService;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("SecretKeyForTestingPurposesMustBeLongEnough123456789", 3600000);
    }

    @Test
    @DisplayName("Should generate and validate JWT token successfully")
    void shouldGenerateAndValidateToken() {
        String token = jwtService.generateToken("test_operator", "OPERATOR");
        assertTrue(jwtService.isTokenValid(token));
        assertEquals("test_operator", jwtService.extractUsername(token));
        assertEquals("OPERATOR", jwtService.extractRole(token));
    }

    @Test
    @DisplayName("Should reject invalid or malformed JWT token")
    void shouldRejectInvalidToken() {
        assertFalse(jwtService.isTokenValid("invalid.token.here"));
    }
}
