package com.example.demo.logging;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LoggingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Request without X-Request-ID receives generated X-Request-ID response header")
    void testHeaderGeneratedWhenMissing() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(header().exists(LoggingConstants.CORRELATION_ID_HEADER))
                .andExpect(header().string(LoggingConstants.CORRELATION_ID_HEADER, notNullValue()));
    }

    @Test
    @DisplayName("Request with X-Request-ID propagates exact X-Request-ID in response header")
    void testHeaderPropagatedWhenProvided() throws Exception {
        String testRequestId = "test-correlation-id-9999";

        mockMvc.perform(get("/v3/api-docs")
                        .header(LoggingConstants.CORRELATION_ID_HEADER, testRequestId))
                .andExpect(header().string(LoggingConstants.CORRELATION_ID_HEADER, testRequestId));
    }

    @Test
    @DisplayName("Unauthorized 401 response still includes X-Request-ID header")
    void testHeaderPresentOnUnauthorizedResponse() throws Exception {
        mockMvc.perform(get("/api/machines"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists(LoggingConstants.CORRELATION_ID_HEADER));
    }
}
