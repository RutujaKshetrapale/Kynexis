package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.example.demo.dto.event.FactoryEventDTO;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Maintenance;
import com.example.demo.entity.Plant;
import com.example.demo.entity.Telemetry;

@ExtendWith(MockitoExtension.class)
class WebSocketEventPublisherServiceTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private WebSocketEventPublisherService publisherService;

    private void setId(Object target, Long id) throws Exception {
        Field field = target.getClass().getDeclaredField("id");
        field.setAccessible(true);
        field.set(target, id);
    }

    @Test
    @DisplayName("Should publish machine status event to /topic/machine-status")
    void shouldPublishMachineStatus() throws Exception {
        Plant plant = new Plant();
        setId(plant, 10L);

        Machine machine = new Machine();
        setId(machine, 1L);
        machine.setName("CNC Mill");
        machine.setType("CNC");
        machine.setStatus("RUNNING");
        machine.setPlant(plant);

        publisherService.publishMachineStatus(machine);

        ArgumentCaptor<FactoryEventDTO> eventCaptor = ArgumentCaptor.forClass(FactoryEventDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/machine-status"), eventCaptor.capture());

        FactoryEventDTO captured = eventCaptor.getValue();
        assertThat(captured.getEventType()).isEqualTo("MACHINE_STATUS_UPDATED");
        assertThat(captured.getMachineId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Should publish telemetry event to /topic/telemetry")
    void shouldPublishTelemetry() throws Exception {
        Machine machine = new Machine();
        setId(machine, 2L);

        Telemetry telemetry = new Telemetry();
        setId(telemetry, 100L);
        telemetry.setMachine(machine);
        telemetry.setTemperature(75.5);
        telemetry.setVibration(1.5);
        telemetry.setPressure(45.0);
        telemetry.setRpm(3000.0);
        telemetry.setTimestamp(LocalDateTime.now());

        publisherService.publishTelemetry(telemetry);

        ArgumentCaptor<FactoryEventDTO> eventCaptor = ArgumentCaptor.forClass(FactoryEventDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/telemetry"), eventCaptor.capture());

        FactoryEventDTO captured = eventCaptor.getValue();
        assertThat(captured.getEventType()).isEqualTo("TELEMETRY_RECORDED");
        assertThat(captured.getMachineId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("Should publish alert event to /topic/alerts")
    void shouldPublishAlert() throws Exception {
        Machine machine = new Machine();
        setId(machine, 3L);

        Alert alert = new Alert();
        setId(alert, 50L);
        alert.setMachine(machine);
        alert.setType("OVERHEATING");
        alert.setSeverity("HIGH");
        alert.setMessage("Temperature exceeded limit");
        alert.setResolved(false);
        alert.setCreatedAt(LocalDateTime.now());

        publisherService.publishAlert(alert);

        ArgumentCaptor<FactoryEventDTO> eventCaptor = ArgumentCaptor.forClass(FactoryEventDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/alerts"), eventCaptor.capture());

        FactoryEventDTO captured = eventCaptor.getValue();
        assertThat(captured.getEventType()).isEqualTo("ALERT_CREATED");
        assertThat(captured.getMachineId()).isEqualTo(3L);
    }

    @Test
    @DisplayName("Should publish maintenance event to /topic/maintenance")
    void shouldPublishMaintenance() throws Exception {
        Machine machine = new Machine();
        setId(machine, 4L);

        Maintenance maintenance = new Maintenance();
        setId(maintenance, 20L);
        maintenance.setMachine(machine);
        maintenance.setType("PREVENTIVE");
        maintenance.setDescription("Oil change");
        maintenance.setScheduledDate(LocalDate.now());
        maintenance.setStatus("SCHEDULED");
        maintenance.setTechnician("Tech John");
        maintenance.setCreatedAt(LocalDateTime.now());

        publisherService.publishMaintenance(maintenance);

        ArgumentCaptor<FactoryEventDTO> eventCaptor = ArgumentCaptor.forClass(FactoryEventDTO.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/maintenance"), eventCaptor.capture());

        FactoryEventDTO captured = eventCaptor.getValue();
        assertThat(captured.getEventType()).isEqualTo("MAINTENANCE_UPDATED");
        assertThat(captured.getMachineId()).isEqualTo(4L);
    }

    @Test
    @DisplayName("Should safely ignore null entities")
    void shouldSafelyIgnoreNullEntities() {
        publisherService.publishMachineStatus(null);
        publisherService.publishTelemetry(null);
        publisherService.publishAlert(null);
        publisherService.publishMaintenance(null);

        verifyNoInteractions(messagingTemplate);
    }
}
