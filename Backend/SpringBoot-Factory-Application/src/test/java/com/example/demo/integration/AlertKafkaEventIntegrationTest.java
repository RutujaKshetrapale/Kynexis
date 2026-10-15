package com.example.demo.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.example.demo.dto.AlertRequest;
import com.example.demo.dto.event.MachineAlertCreated;
import com.example.demo.dto.event.MachineAlertResolved;
import com.example.demo.dto.event.MachineAlertUpdated;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Plant;
import com.example.demo.entity.Telemetry;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.PlantRepository;
import com.example.demo.repository.TelemetryRepository;
import com.example.demo.service.AlertService;
import com.example.demo.service.WebSocketEventPublisherService;
import com.example.demo.service.alert.AlertEngineService;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "kynexis.kafka.enabled=true",
        "spring.cache.type=simple",
        "kynexis.alert-engine.enabled=true",
        "kynexis.alert-engine.temperature-high-enabled=true",
        "kynexis.alert-engine.temperature-high-threshold=85.0",
        "kynexis.alert-engine.temperature-high-severity=HIGH"
})
class AlertKafkaEventIntegrationTest {

    @Autowired
    private AlertService alertService;

    @Autowired
    private AlertEngineService alertEngineService;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private MachineRepository machineRepository;

    @Autowired
    private PlantRepository plantRepository;

    @Autowired
    private TelemetryRepository telemetryRepository;

    @MockitoBean
    private KafkaTemplate<String, Object> kafkaTemplate;

    @MockitoSpyBean
    private WebSocketEventPublisherService webSocketEventPublisherService;

    private Machine testMachine;

    @BeforeEach
    void setUp() {
        when(kafkaTemplate.send(any(), any(), any()))
                .thenReturn(CompletableFuture.completedFuture(new SendResult<>(null, null)));

        alertRepository.deleteAll();
        telemetryRepository.deleteAll();
        machineRepository.deleteAll();
        plantRepository.deleteAll();

        Plant plant = new Plant();
        plant.setName("Alert Kafka Plant");
        plant.setLocation("Hyderabad");
        plant.setActive(true);
        plant = plantRepository.save(plant);

        Machine machine = new Machine();
        machine.setName("Kafka CNC Machine");
        machine.setType("CNC");
        machine.setStatus("RUNNING");
        machine.setPlant(plant);
        testMachine = machineRepository.save(machine);
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        alertRepository.deleteAll();
        telemetryRepository.deleteAll();
        machineRepository.deleteAll();
        plantRepository.deleteAll();
    }

    @Test
    @DisplayName("Alert lifecycle: create -> update -> resolve publishes corresponding Kafka events and preserves WebSocket notifications")
    void testAlertLifecycleKafkaEvents() {
        // 1. Create Alert
        AlertRequest createRequest = new AlertRequest();
        createRequest.setMachineId(testMachine.getId());
        createRequest.setType("TEMPERATURE_HIGH");
        createRequest.setSeverity("HIGH");
        createRequest.setMessage("Spindle temperature high");
        createRequest.setResolved(false);

        Alert createdAlert = alertService.create(createRequest);
        assertThat(createdAlert.getId()).isNotNull();

        // Verify WebSocket publication intact
        verify(webSocketEventPublisherService, atLeastOnce()).publishAlert(any(Alert.class));

        // Verify Kafka event created
        ArgumentCaptor<Object> createdCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate, times(1)).send(
                eq("kynexis.machine-alerts"),
                eq(String.valueOf(testMachine.getId())),
                createdCaptor.capture()
        );
        assertThat(createdCaptor.getValue()).isInstanceOf(MachineAlertCreated.class);
        MachineAlertCreated createdEvent = (MachineAlertCreated) createdCaptor.getValue();
        assertThat(createdEvent.getAlertId()).isEqualTo(createdAlert.getId());
        assertThat(createdEvent.getSeverity()).isEqualTo("HIGH");
        assertThat(createdEvent.isResolved()).isFalse();

        // 2. Update Alert (meaningful change: severity escalated to CRITICAL)
        AlertRequest updateRequest = new AlertRequest();
        updateRequest.setMachineId(testMachine.getId());
        updateRequest.setType("TEMPERATURE_HIGH");
        updateRequest.setSeverity("CRITICAL");
        updateRequest.setMessage("Spindle temperature critical!");
        updateRequest.setResolved(false);

        Alert updatedAlert = alertService.update(createdAlert.getId(), updateRequest);

        ArgumentCaptor<Object> updatedCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate, times(2)).send(
                eq("kynexis.machine-alerts"),
                eq(String.valueOf(testMachine.getId())),
                updatedCaptor.capture()
        );
        assertThat(updatedCaptor.getValue()).isInstanceOf(MachineAlertUpdated.class);
        MachineAlertUpdated updatedEvent = (MachineAlertUpdated) updatedCaptor.getValue();
        assertThat(updatedEvent.getAlertId()).isEqualTo(updatedAlert.getId());
        assertThat(updatedEvent.getSeverity()).isEqualTo("CRITICAL");
        assertThat(updatedEvent.isResolved()).isFalse();

        // 3. Resolve Alert
        AlertRequest resolveRequest = new AlertRequest();
        resolveRequest.setMachineId(testMachine.getId());
        resolveRequest.setType("TEMPERATURE_HIGH");
        resolveRequest.setSeverity("CRITICAL");
        resolveRequest.setMessage("Temperature normalized");
        resolveRequest.setResolved(true);

        Alert resolvedAlert = alertService.update(createdAlert.getId(), resolveRequest);

        ArgumentCaptor<Object> resolvedCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate, times(3)).send(
                eq("kynexis.machine-alerts"),
                eq(String.valueOf(testMachine.getId())),
                resolvedCaptor.capture()
        );
        assertThat(resolvedCaptor.getValue()).isInstanceOf(MachineAlertResolved.class);
        MachineAlertResolved resolvedEvent = (MachineAlertResolved) resolvedCaptor.getValue();
        assertThat(resolvedEvent.getAlertId()).isEqualTo(resolvedAlert.getId());
        assertThat(resolvedEvent.isResolved()).isTrue();
    }

    @Test
    @DisplayName("Alert Engine Deduplication: unchanging alert conditions do NOT trigger duplicate Kafka events")
    void testAlertEngineDeduplicationNoDuplicateKafkaEvents() {
        // Initial breached telemetry (90.0°C > 85.0°C)
        Telemetry t1 = new Telemetry();
        t1.setMachine(testMachine);
        t1.setTemperature(90.0);
        t1.setVibration(1.0);
        t1.setPressure(40.0);
        t1.setRpm(2000.0);
        t1.setTimestamp(LocalDateTime.now());
        t1 = telemetryRepository.save(t1);

        alertEngineService.evaluateTelemetry(t1);

        // Exactly one Kafka alert event was published (MachineAlertCreated)
        verify(kafkaTemplate, times(1)).send(eq("kynexis.machine-alerts"), eq(String.valueOf(testMachine.getId())), any());

        // Subsequent telemetry reading also breached with identical severity and message
        Telemetry t2 = new Telemetry();
        t2.setMachine(testMachine);
        t2.setTemperature(90.0);
        t2.setVibration(1.0);
        t2.setPressure(40.0);
        t2.setRpm(2000.0);
        t2.setTimestamp(LocalDateTime.now().plusSeconds(10));
        t2 = telemetryRepository.save(t2);

        alertEngineService.evaluateTelemetry(t2);

        // Verification: Deduplication in AlertEngineService prevented redundant update and Kafka publishing!
        verify(kafkaTemplate, times(1)).send(eq("kynexis.machine-alerts"), eq(String.valueOf(testMachine.getId())), any());
    }
}
