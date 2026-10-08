package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Field;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.demo.entity.Maintenance;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.service.MaintenanceService;

@ExtendWith(MockitoExtension.class)
class MaintenanceControllerMockMvcTest {

    private MockMvc mockMvc;

    @Mock
    private MaintenanceService maintenanceService;

    private MaintenanceController maintenanceController;

    private Maintenance maintenance;

    @BeforeEach
    void setUp() throws Exception {
        maintenanceController = new MaintenanceController(maintenanceService);
        mockMvc = MockMvcBuilders
                .standaloneSetup(maintenanceController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        maintenance = new Maintenance();
        setId(maintenance, 1L);
        maintenance.setType("PREVENTIVE");
        maintenance.setDescription("Quarterly lubrication and filter replacement");
        maintenance.setStatus("SCHEDULED");
        maintenance.setScheduledDate(LocalDate.now().plusDays(5));
        maintenance.setTechnician("Tech John");
    }

    private void setId(Object target, Long id) throws Exception {
        Field field = target.getClass().getDeclaredField("id");
        field.setAccessible(true);
        field.set(target, id);
    }

    @Test
    @DisplayName("Should create maintenance record successfully")
    void shouldCreateMaintenance() throws Exception {
        when(maintenanceService.create(any())).thenReturn(maintenance);

        String json = """
                {
                    "machineId": 1,
                    "type": "PREVENTIVE",
                    "description": "Quarterly lubrication and filter replacement",
                    "status": "SCHEDULED",
                    "scheduledDate": "2026-10-15",
                    "technician": "Tech John"
                }
                """;

        mockMvc.perform(post("/api/maintenance")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.type").value("PREVENTIVE"));
    }

    @Test
    @DisplayName("Should get maintenance by ID")
    void shouldGetMaintenanceById() throws Exception {
        when(maintenanceService.getById(1L)).thenReturn(maintenance);

        mockMvc.perform(get("/api/maintenance/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.type").value("PREVENTIVE"));
    }

    @Test
    @DisplayName("Should return 404 when maintenance not found")
    void shouldReturn404WhenNotFound() throws Exception {
        when(maintenanceService.getById(99L)).thenThrow(new ResourceNotFoundException("Maintenance log not found with ID: 99"));

        mockMvc.perform(get("/api/maintenance/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("Should update maintenance record")
    void shouldUpdateMaintenance() throws Exception {
        when(maintenanceService.update(eq(1L), any())).thenReturn(maintenance);

        String json = """
                {
                    "machineId": 1,
                    "type": "PREVENTIVE",
                    "description": "Updated description",
                    "status": "IN_PROGRESS",
                    "scheduledDate": "2026-10-15",
                    "technician": "Tech John"
                }
                """;

        mockMvc.perform(put("/api/maintenance/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("Should delete maintenance record")
    void shouldDeleteMaintenance() throws Exception {
        doNothing().when(maintenanceService).delete(1L);

        mockMvc.perform(delete("/api/maintenance/1"))
                .andExpect(status().isNoContent());
    }
}
