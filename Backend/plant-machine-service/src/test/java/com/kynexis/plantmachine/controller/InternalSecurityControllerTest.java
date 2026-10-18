package com.kynexis.plantmachine.controller;

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

import com.kynexis.common.logging.LoggingConstants;
import com.kynexis.common.security.InternalSecurityFilter;
import com.kynexis.common.security.JwtService;
import com.kynexis.plantmachine.service.MachineService;

class InternalSecurityControllerTest {

    private MockMvc mockMvc;
    private MachineService machineService;
    private static final String INTERNAL_SECRET = "KynexisInternalServiceCommunicationSecretKey2026";

    @BeforeEach
    void setUp() {
        machineService = mock(MachineService.class);
        MachineController controller = new MachineController(machineService);
        JwtService jwtService = mock(JwtService.class);
        InternalSecurityFilter filter = new InternalSecurityFilter(jwtService, INTERNAL_SECRET);

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

    @Test
    @DisplayName("Should allow access with valid propagated user headers and internal secret")
    void shouldAllowAccessWithPropagatedUserAndSecret() throws Exception {
        when(machineService.existsById(2L)).thenReturn(false);

        mockMvc.perform(get("/api/machines/2/exists")
                        .header(LoggingConstants.INTERNAL_SECRET_HEADER, INTERNAL_SECRET)
                        .header(LoggingConstants.USER_ID_HEADER, "valid_user")
                        .header(LoggingConstants.USER_ROLES_HEADER, "OPERATOR"))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }
}
