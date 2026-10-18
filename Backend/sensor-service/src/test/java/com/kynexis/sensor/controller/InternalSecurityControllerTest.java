package com.kynexis.sensor.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.kynexis.sensor.common.logging.LoggingConstants;
import com.kynexis.sensor.common.security.InternalSecurityFilter;
import com.kynexis.sensor.service.SensorService;

class InternalSecurityControllerTest {

    private MockMvc mockMvc;
    private SensorService sensorService;
    private static final String INTERNAL_SECRET = "KynexisInternalServiceCommunicationSecretKey2026";

    @BeforeEach
    void setUp() {
        sensorService = mock(SensorService.class);
        SensorController controller = new SensorController(sensorService);
        InternalSecurityFilter filter = new InternalSecurityFilter(INTERNAL_SECRET);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .addFilters(filter)
                .build();
    }

    @Test
    @DisplayName("Should allow internal service access when valid X-Internal-Secret is provided")
    void shouldAllowAccessWithValidInternalSecret() throws Exception {
        when(sensorService.count()).thenReturn(10L);

        mockMvc.perform(get("/api/sensors/count")
                        .header(LoggingConstants.INTERNAL_SECRET_HEADER, INTERNAL_SECRET))
                .andExpect(status().isOk())
                .andExpect(content().string("10"));
    }
}
