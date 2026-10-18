package com.kynexis.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private static final String SECRET = "SmartFactorySecretKeyForDevelopmentOnly123456789";
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, 3600000L); // 1 hour expiration
    }

    @Test
    @DisplayName("Successfully generates token and extracts claims")
    void testGenerateAndExtractClaims() {
        String token = jwtService.generateToken("john_doe", "ENGINEER");

        assertThat(token).isNotBlank();
        assertThat(jwtService.isTokenValid(token)).isTrue();
        assertThat(jwtService.extractUsername(token)).isEqualTo("john_doe");
        assertThat(jwtService.extractRole(token)).isEqualTo("ENGINEER");
    }

    @Test
    @DisplayName("Token validation fails for expired token")
    void testExpiredTokenValidation() {
        JwtService shortLivedService = new JwtService(SECRET, -1000L); // expired 1s ago
        String expiredToken = shortLivedService.generateToken("expired_user", "OPERATOR");

        assertThat(jwtService.isTokenValid(expiredToken)).isFalse();
    }

    @Test
    @DisplayName("Token validation fails for tampered token")
    void testTamperedTokenValidation() {
        String token = jwtService.generateToken("alice", "ADMIN");
        String tamperedToken = token + "corrupted";

        assertThat(jwtService.isTokenValid(tamperedToken)).isFalse();
    }

    @Test
    @DisplayName("Rejects short/weak secret key (< 32 bytes)")
    void testShortKeyRejection() {
        assertThatThrownBy(() -> new JwtService("short-secret-under-32-chars", 3600000L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least 256 bits");
    }

    @Test
    @DisplayName("Fails in production mode if using default dev secret")
    void testProductionFailsWithDevSecret() {
        assertThatThrownBy(() -> new JwtService(
                JwtService.DEFAULT_DEV_SECRET,
                3600000L,
                "kynexis",
                "kynexis-api",
                "prod",
                "production"
        )).isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Production JWT secret must be explicitly configured");
    }
}
