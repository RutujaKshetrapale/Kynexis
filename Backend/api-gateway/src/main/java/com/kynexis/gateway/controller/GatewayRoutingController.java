package com.kynexis.gateway.controller;

import java.io.InputStream;
import java.net.URI;
import java.util.*;

import org.slf4j.MDC;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.kynexis.common.logging.LoggingConstants;
import com.kynexis.gateway.config.GatewayProperties;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
public class GatewayRoutingController {

    private final GatewayProperties gatewayProperties;
    private final RestClient restClient;

    public GatewayRoutingController(GatewayProperties gatewayProperties) {
        this.gatewayProperties = gatewayProperties;
        this.restClient = RestClient.builder().build();
    }

    @RequestMapping("/api/**")
    public ResponseEntity<?> routeRequest(HttpServletRequest request) {
        String path = request.getRequestURI();
        String queryString = request.getQueryString();
        String targetServiceUrl = resolveTargetServiceUrl(path);

        if (targetServiceUrl == null) {
            log.warn("Gateway: No route found for path={}", path);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No route found", "path", path));
        }

        String targetUrl = targetServiceUrl + path + (queryString != null ? "?" + queryString : "");
        HttpMethod method = HttpMethod.valueOf(request.getMethod());

        log.debug("Routing {} {} -> {}", method, path, targetUrl);

        try {
            byte[] body = null;
            if ("POST".equalsIgnoreCase(request.getMethod())
                    || "PUT".equalsIgnoreCase(request.getMethod())
                    || "PATCH".equalsIgnoreCase(request.getMethod())) {
                try (InputStream is = request.getInputStream()) {
                    body = is.readAllBytes();
                }
            }

            HttpHeaders headers = new HttpHeaders();
            copyHeaders(request, headers);
            injectIdentityHeaders(request, headers);

            RestClient.RequestBodySpec spec = restClient.method(method)
                    .uri(URI.create(targetUrl))
                    .headers(h -> h.addAll(headers));

            if (body != null && body.length > 0) {
                spec.body(body);
            }

            return spec.exchange((clientRequest, clientResponse) -> {
                HttpHeaders responseHeaders = new HttpHeaders();
                clientResponse.getHeaders().forEach((name, values) -> {
                    if (!HttpHeaders.TRANSFER_ENCODING.equalsIgnoreCase(name)
                            && !HttpHeaders.CONTENT_LENGTH.equalsIgnoreCase(name)) {
                        responseHeaders.put(name, values);
                    }
                });

                byte[] responseBody = clientResponse.getBody().readAllBytes();
                return new ResponseEntity<>(
                        responseBody,
                        responseHeaders,
                        clientResponse.getStatusCode()
                );
            });

        } catch (RestClientResponseException ex) {
            log.debug("Downstream returned HTTP error {} for {}: {}", ex.getStatusCode(), targetUrl, ex.getMessage());
            return ResponseEntity.status(ex.getStatusCode())
                    .headers(ex.getResponseHeaders())
                    .body(ex.getResponseBodyAsByteArray());
        } catch (ResourceAccessException ex) {
            log.error("Downstream service unreachable: {} error={}", targetUrl, ex.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "error", "Service Unavailable",
                            "message", "Target microservice is temporarily unreachable",
                            "path", path
                    ));
        } catch (Exception ex) {
            log.error("Gateway proxy error routing to {}: {}", targetUrl, ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of(
                            "error", "Bad Gateway",
                            "message", ex.getMessage() != null ? ex.getMessage() : "Gateway Error",
                            "path", path
                    ));
        }
    }

    public String resolveTargetServiceUrl(String path) {
        if (path == null) return null;

        if (path.startsWith("/api/auth")) {
            return gatewayProperties.getIdentityService().getUrl();
        }

        // Special machine health & maintenance routing
        if (path.matches("^/api/machines/\\d+/health$") || "/api/machines/health".equals(path)
                || path.matches("^/api/machines/\\d+/maintenance-assessment$")
                || "/api/machines/maintenance-assessments".equals(path)) {
            return gatewayProperties.getMaintenanceService().getUrl();
        }

        if (path.startsWith("/api/plants") || path.startsWith("/api/machines") || path.startsWith("/api/sensors")) {
            return gatewayProperties.getPlantMachineService().getUrl();
        }

        if (path.startsWith("/api/telemetry")) {
            return gatewayProperties.getTelemetryService().getUrl();
        }

        if (path.startsWith("/api/alerts")) {
            return gatewayProperties.getAlertService().getUrl();
        }

        if (path.startsWith("/api/maintenance") || path.startsWith("/api/machine-health")
                || path.startsWith("/api/predictive-maintenance")) {
            return gatewayProperties.getMaintenanceService().getUrl();
        }

        if (path.startsWith("/api/production") || path.startsWith("/api/energy")) {
            return gatewayProperties.getProductionEnergyService().getUrl();
        }

        if (path.startsWith("/api/dashboard")) {
            return gatewayProperties.getDashboardService().getUrl();
        }

        return null;
    }

    private void copyHeaders(HttpServletRequest source, HttpHeaders target) {
        Enumeration<String> headerNames = source.getHeaderNames();
        while (headerNames != null && headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            if (HttpHeaders.HOST.equalsIgnoreCase(name)
                    || HttpHeaders.CONTENT_LENGTH.equalsIgnoreCase(name)) {
                continue;
            }
            Enumeration<String> values = source.getHeaders(name);
            while (values.hasMoreElements()) {
                target.add(name, values.nextElement());
            }
        }
    }

    private void injectIdentityHeaders(HttpServletRequest request, HttpHeaders headers) {
        String correlationId = MDC.get(LoggingConstants.CORRELATION_ID_MDC_KEY);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = request.getHeader(LoggingConstants.CORRELATION_ID_HEADER);
        }
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }
        headers.set(LoggingConstants.CORRELATION_ID_HEADER, correlationId);

        Object userIdAttr = request.getAttribute("X-User-Id");
        if (userIdAttr != null) {
            headers.set("X-User-Id", userIdAttr.toString());
        }

        Object rolesAttr = request.getAttribute("X-User-Roles");
        if (rolesAttr != null) {
            headers.set("X-User-Roles", rolesAttr.toString());
        } else {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                String roles = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .reduce((a, b) -> a + "," + b)
                        .orElse("");
                headers.set("X-User-Roles", roles);
            }
        }
    }
}
