package com.kynexis.gateway.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.kynexis.common.dto.event.FactoryEventDTO;
import com.kynexis.common.dto.event.FactoryEventDTO.*;

@ExtendWith(MockitoExtension.class)
class WebSocketEventPublisherServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private WebSocketEventPublisherService publisherService;

    @Test
    @DisplayName("Should publish machine status event to /topic/machine-status")
    void shouldPublishMachineStatus() {
        MachineStatusPayload payload = new MachineStatusPayload(1L, "CNC Mill", "CNC", "RUNNING", 10L);

        publisherService.publishMachineStatus(payload);

        ArgumentCaptor<FactoryEventDTO> captor = ArgumentCaptor.forClass(FactoryEventDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/machine-status"), captor.capture());

        FactoryEventDTO captured = captor.getValue();
        assertThat(captured.getEventType()).isEqualTo("MACHINE_STATUS_UPDATED");
        assertThat(captured.getMachineId()).isEqualTo(1L);
        assertThat(captured.getPayload()).isEqualTo(payload);
    }

    @Test
    @DisplayName("Should publish telemetry event to /topic/telemetry")
    void shouldPublishTelemetry() {
        TelemetryPayload payload = new TelemetryPayload(100L, 2L, 75.5, 1.2, 45.0, 3000.0, LocalDateTime.now());

        publisherService.publishTelemetry(payload);

        ArgumentCaptor<FactoryEventDTO> captor = ArgumentCaptor.forClass(FactoryEventDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/telemetry"), captor.capture());

        FactoryEventDTO captured = captor.getValue();
        assertThat(captured.getEventType()).isEqualTo("TELEMETRY_RECORDED");
        assertThat(captured.getMachineId()).isEqualTo(2L);
        assertThat(captured.getPayload()).isEqualTo(payload);
    }

    @Test
    @DisplayName("Should publish alert event to /topic/alerts")
    void shouldPublishAlert() {
        AlertPayload payload = new AlertPayload(50L, 3L, "HIGH_TEMPERATURE", "HIGH", "Temp exceeded threshold", false, LocalDateTime.now());

        publisherService.publishAlert(payload);

        ArgumentCaptor<FactoryEventDTO> captor = ArgumentCaptor.forClass(FactoryEventDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/alerts"), captor.capture());

        FactoryEventDTO captured = captor.getValue();
        assertThat(captured.getEventType()).isEqualTo("ALERT_CREATED");
        assertThat(captured.getMachineId()).isEqualTo(3L);
        assertThat(captured.getPayload()).isEqualTo(payload);
    }

    @Test
    @DisplayName("Should publish maintenance event to /topic/maintenance")
    void shouldPublishMaintenance() {
        MaintenancePayload payload = new MaintenancePayload(20L, 4L, "PREVENTIVE", "Oil change", LocalDate.now(), null, "SCHEDULED", "John Doe", LocalDateTime.now());

        publisherService.publishMaintenance(payload);

        ArgumentCaptor<FactoryEventDTO> captor = ArgumentCaptor.forClass(FactoryEventDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/maintenance"), captor.capture());

        FactoryEventDTO captured = captor.getValue();
        assertThat(captured.getEventType()).isEqualTo("MAINTENANCE_UPDATED");
        assertThat(captured.getMachineId()).isEqualTo(4L);
        assertThat(captured.getPayload()).isEqualTo(payload);
    }

    @Test
    @DisplayName("Should safely ignore null payloads")
    void shouldSafelyIgnoreNullPayloads() {
        publisherService.publishMachineStatus(null);
        publisherService.publishTelemetry(null);
        publisherService.publishAlert(null);
        publisherService.publishMaintenance(null);

        verifyNoInteractions(messagingTemplate);
    }
}
