package com.kynexis.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.kynexis.common.security.JwtService;

class JwtServiceTest {

    private JwtService jwtService;
    private static final String SECRET = "SecretKeyForTestingPurposesMustBeLongEnough123456789";

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, 3600000, "kynexis", "kynexis-api");
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

    @Test
    @DisplayName("Should reject expired token")
    void shouldRejectExpiredToken() throws InterruptedException {
        JwtService shortLivedService = new JwtService(SECRET, 1, "kynexis", "kynexis-api");
        String token = shortLivedService.generateToken("expired_user", "OPERATOR");
        Thread.sleep(10);
        assertFalse(shortLivedService.isTokenValid(token));
    }

    @Test
    @DisplayName("Should reject token when issuer mismatches")
    void shouldRejectTokenWithIssuerMismatch() {
        JwtService otherIssuerService = new JwtService(SECRET, 3600000, "other-issuer", "kynexis-api");
        String token = otherIssuerService.generateToken("user1", "ADMIN");
        // validate with our service expecting issuer 'kynexis'
        assertFalse(jwtService.isTokenValid(token));
    }

    @Test
    @DisplayName("Should reject token when audience mismatches")
    void shouldRejectTokenWithAudienceMismatch() {
        JwtService otherAudienceService = new JwtService(SECRET, 3600000, "kynexis", "other-audience");
        String token = otherAudienceService.generateToken("user1", "ADMIN");
        assertFalse(jwtService.isTokenValid(token));
    }

    @Test
    @DisplayName("Should fail securely in production if secret is missing or default")
    void shouldFailSecurelyInProduction() {
        assertThrows(IllegalStateException.class, () ->
                new JwtService(JwtService.DEFAULT_DEV_SECRET, 3600000, "kynexis", "kynexis-api", "prod", "prod")
        );
    }
}
