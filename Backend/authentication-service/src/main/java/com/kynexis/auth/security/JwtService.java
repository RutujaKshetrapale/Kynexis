package com.kynexis.auth.security;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;
import java.util.List;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class JwtService {

    public static final String DEFAULT_DEV_SECRET = "SmartFactorySecretKeyForDevelopmentOnly123456789";

    private final SecretKey secretKey;
    private final long expiration;
    private final String issuer;
    private final String audience;

    public JwtService(
            @Value("${jwt.secret:" + DEFAULT_DEV_SECRET + "}") String secret,
            @Value("${jwt.expiration:86400000}") long expiration,
            @Value("${jwt.issuer:kynexis}") String issuer,
            @Value("${jwt.audience:kynexis-api}") String audience,
            @Value("${spring.profiles.active:dev}") String activeProfiles,
            @Value("${app.env:dev}") String appEnv) {

        boolean isProduction = "prod".equalsIgnoreCase(appEnv)
                || "production".equalsIgnoreCase(appEnv)
                || (activeProfiles != null && (activeProfiles.contains("prod") || activeProfiles.contains("production")));

        if (isProduction && (secret == null || secret.isBlank() || DEFAULT_DEV_SECRET.equals(secret))) {
            throw new IllegalStateException("FATAL SECURITY CONFIGURATION: Production JWT secret must be explicitly configured via JWT_SECRET environment variable.");
        }

        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("JWT signing key must be at least 256 bits (32 bytes) long.");
        }

        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
        this.issuer = issuer != null ? issuer.trim() : "kynexis";
        this.audience = audience != null ? audience.trim() : "kynexis-api";
    }

    public JwtService(String secret, long expiration) {
        this(secret, expiration, "kynexis", "kynexis-api", "dev", "dev");
    }

    public JwtService(String secret, long expiration, String issuer, String audience) {
        this(secret, expiration, issuer, audience, "dev", "dev");
    }

    public String generateToken(String username, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiration);

        String roleWithPrefix = (role != null && role.startsWith("ROLE_")) ? role : "ROLE_" + role;

        return Jwts.builder()
                .subject(username)
                .issuer(issuer)
                .audience().add(audience).and()
                .claim("role", role)
                .claim("roles", List.of(roleWithPrefix))
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractRole(String token) {
        Claims claims = extractAllClaims(token);
        String role = claims.get("role", String.class);
        if (role != null) {
            return role;
        }

        Object rolesObj = claims.get("roles");
        if (rolesObj instanceof Collection<?> coll && !coll.isEmpty()) {
            return coll.iterator().next().toString();
        }
        return null;
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);

            boolean isExpired = claims.getExpiration() == null || claims.getExpiration().before(new Date());
            if (isExpired) {
                log.warn("JWT validation failed: token is expired");
                return false;
            }

            if (claims.getIssuer() != null && !issuer.equals(claims.getIssuer())) {
                log.warn("JWT validation failed: issuer mismatch expected={} actual={}", issuer, claims.getIssuer());
                return false;
            }

            if (claims.getAudience() != null && !claims.getAudience().isEmpty() && !claims.getAudience().contains(audience)) {
                log.warn("JWT validation failed: audience mismatch expected={}", audience);
                return false;
            }

            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.warn("JWT signature or format validation failed: {}", ex.getMessage());
            return false;
        }
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
