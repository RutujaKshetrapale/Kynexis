package com.example.demo.logging;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String requestId = extractOrGenerateRequestId(request);

        MDC.put(LoggingConstants.CORRELATION_ID_KEY, requestId);
        response.setHeader(LoggingConstants.CORRELATION_ID_HEADER, requestId);

        long startTime = System.currentTimeMillis();
        String method = request.getMethod();
        String uri = request.getRequestURI();

        log.info("REQUEST method={} uri={} requestId={}", method, uri, requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();

            log.info("RESPONSE method={} uri={} status={} durationMs={} requestId={}",
                    method, uri, status, duration, requestId);

            MDC.remove(LoggingConstants.CORRELATION_ID_KEY);
        }
    }

    private String extractOrGenerateRequestId(HttpServletRequest request) {
        String headerRequestId = request.getHeader(LoggingConstants.CORRELATION_ID_HEADER);
        if (!StringUtils.hasText(headerRequestId)) {
            headerRequestId = request.getHeader("X-Correlation-ID");
        }

        if (StringUtils.hasText(headerRequestId) && headerRequestId.length() <= 128) {
            return headerRequestId.trim();
        }

        return UUID.randomUUID().toString();
    }
}
