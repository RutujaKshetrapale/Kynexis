package com.kynexis.machine.controller;

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

import com.kynexis.machine.common.logging.LoggingConstants;
import com.kynexis.machine.common.security.InternalSecurityFilter;
import com.kynexis.machine.service.MachineService;

class InternalSecurityControllerTest {

    private MockMvc mockMvc;
    private MachineService machineService;
    private static final String INTERNAL_SECRET = "KynexisInternalServiceCommunicationSecretKey2026";

    @BeforeEach
    void setUp() {
        machineService = mock(MachineService.class);
        MachineController controller = new MachineController(machineService);
        InternalSecurityFilter filter = new InternalSecurityFilter(INTERNAL_SECRET);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .addFilters(filter)
                .build();
    }

    @Test
    @DisplayName("Should allow internal service access when valid X-Internal-Secret is provided")
    void shouldAllowAccessWithValidInternalSecret() throws Exception {
        when(machineService.existsById(1L)).thenReturn(true);

        mockMvc.perform(get("/api/machines/1/exists")
                        .header(LoggingConstants.INTERNAL_SECRET_HEADER, INTERNAL_SECRET))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }
}
