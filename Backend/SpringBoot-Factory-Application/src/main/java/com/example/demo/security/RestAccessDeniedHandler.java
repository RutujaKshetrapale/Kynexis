package com.example.demo.security;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class RestAccessDeniedHandler
        implements AccessDeniedHandler {

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException)
            throws IOException {

        log.warn("Access denied path={} message={}", request.getRequestURI(), accessDeniedException.getMessage());

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        String json = """
                {
                    "timestamp": "%s",
                    "status": 403,
                    "error": "FORBIDDEN",
                    "message": "You do not have permission to access this resource",
                    "path": "%s"
                }
                """.formatted(
                        java.time.LocalDateTime.now(),
                        request.getRequestURI()
                );

        response.getWriter().write(json);
    }
}