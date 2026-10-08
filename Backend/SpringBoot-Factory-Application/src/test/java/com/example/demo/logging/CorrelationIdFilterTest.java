package com.example.demo.logging;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.ServletException;

class CorrelationIdFilterTest {

    private CorrelationIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new CorrelationIdFilter();
        MDC.clear();
    }

    @Test
    void doFilter_GeneratesNewRequestId_WhenHeaderNotProvided() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/machines");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> mdcValueDuringExecution = new AtomicReference<>();

        MockFilterChain filterChain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
                    throws IOException, ServletException {
                mdcValueDuringExecution.set(MDC.get(LoggingConstants.CORRELATION_ID_KEY));
                super.doFilter(req, res);
            }
        };

        filter.doFilter(request, response, filterChain);

        String responseHeaderId = response.getHeader(LoggingConstants.CORRELATION_ID_HEADER);

        assertNotNull(responseHeaderId, "Response should contain X-Request-ID header");
        assertFalse(responseHeaderId.isBlank(), "X-Request-ID should not be blank");
        assertEquals(responseHeaderId, mdcValueDuringExecution.get(), "MDC value should match response header ID");
        assertNull(MDC.get(LoggingConstants.CORRELATION_ID_KEY), "MDC should be cleared after filter execution");
    }

    @Test
    void doFilter_PropagatesExistingRequestId_WhenClientHeaderProvided() throws ServletException, IOException {
        String clientRequestId = "custom-client-req-12345";
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/plants");
        request.addHeader(LoggingConstants.CORRELATION_ID_HEADER, clientRequestId);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> mdcValueDuringExecution = new AtomicReference<>();

        MockFilterChain filterChain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
                    throws IOException, ServletException {
                mdcValueDuringExecution.set(MDC.get(LoggingConstants.CORRELATION_ID_KEY));
                super.doFilter(req, res);
            }
        };

        filter.doFilter(request, response, filterChain);

        assertEquals(clientRequestId, response.getHeader(LoggingConstants.CORRELATION_ID_HEADER));
        assertEquals(clientRequestId, mdcValueDuringExecution.get());
        assertNull(MDC.get(LoggingConstants.CORRELATION_ID_KEY), "MDC should be cleared after request");
    }

    @Test
    void doFilter_ClearsMdc_WhenExceptionThrown() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/error");
        MockHttpServletResponse response = new MockHttpServletResponse();

        MockFilterChain filterChain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
                    throws ServletException {
                throw new ServletException("Simulated unexpected failure");
            }
        };

        assertThrows(ServletException.class, () -> filter.doFilter(request, response, filterChain));
        assertNull(MDC.get(LoggingConstants.CORRELATION_ID_KEY), "MDC should be cleared even when an exception occurs");
    }
}
