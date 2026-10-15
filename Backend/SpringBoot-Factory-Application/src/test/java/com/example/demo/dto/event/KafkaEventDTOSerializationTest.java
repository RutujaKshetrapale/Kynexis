package com.example.demo.dto.event;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

class KafkaEventDTOSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Verify MachineTelemetryRecorded serialization and deserialization roundtrip")
    void testMachineTelemetryRecordedSerialization() throws Exception {
        LocalDateTime timestamp = LocalDateTime.of(2026, 10, 15, 12, 0, 0);
        String eventId = UUID.randomUUID().toString();
        String correlationId = "corr-" + UUID.randomUUID();

        MachineTelemetryRecorded event = MachineTelemetryRecorded.builder()
                .eventId(eventId)
                .eventType(MachineTelemetryRecorded.EVENT_TYPE)
                .schemaVersion(MachineTelemetryRecorded.SCHEMA_VERSION)
                .timestamp(timestamp)
                .machineId(101L)
                .telemetryId(501L)
                .temperature(78.5)
                .vibration(1.2)
                .pressure(55.0)
                .rpm(2800.0)
                .telemetryTimestamp(timestamp)
                .correlationId(correlationId)
                .build();

        String json = objectMapper.writeValueAsString(event);

        assertThat(json).contains("\"eventId\":\"" + eventId + "\"");
        assertThat(json).contains("\"eventType\":\"MachineTelemetryRecorded\"");
        assertThat(json).contains("\"schemaVersion\":\"1.0\"");
        assertThat(json).contains("\"machineId\":101");
        assertThat(json).contains("\"telemetryId\":501");
        assertThat(json).contains("\"temperature\":78.5");
        assertThat(json).contains("\"vibration\":1.2");
        assertThat(json).contains("\"pressure\":55.0");
        assertThat(json).contains("\"rpm\":2800.0");
        assertThat(json).contains("\"correlationId\":\"" + correlationId + "\"");
        assertThat(json).doesNotContain("password");
        assertThat(json).doesNotContain("secret");
        assertThat(json).doesNotContain("token");

        MachineTelemetryRecorded deserialized = objectMapper.readValue(json, MachineTelemetryRecorded.class);
        assertThat(deserialized.getEventId()).isEqualTo(eventId);
        assertThat(deserialized.getEventType()).isEqualTo("MachineTelemetryRecorded");
        assertThat(deserialized.getSchemaVersion()).isEqualTo("1.0");
        assertThat(deserialized.getMachineId()).isEqualTo(101L);
        assertThat(deserialized.getTelemetryId()).isEqualTo(501L);
        assertThat(deserialized.getTemperature()).isEqualTo(78.5);
        assertThat(deserialized.getVibration()).isEqualTo(1.2);
        assertThat(deserialized.getPressure()).isEqualTo(55.0);
        assertThat(deserialized.getRpm()).isEqualTo(2800.0);
        assertThat(deserialized.getCorrelationId()).isEqualTo(correlationId);
    }

    @Test
    @DisplayName("Verify MachineAlertCreated serialization and deserialization roundtrip")
    void testMachineAlertCreatedSerialization() throws Exception {
        LocalDateTime createdAt = LocalDateTime.of(2026, 10, 15, 12, 10, 0);
        String eventId = UUID.randomUUID().toString();
        String correlationId = "corr-alert-create";

        MachineAlertCreated event = MachineAlertCreated.builder()
                .eventId(eventId)
                .eventType(MachineAlertCreated.EVENT_TYPE)
                .schemaVersion(MachineAlertCreated.SCHEMA_VERSION)
                .timestamp(createdAt)
                .machineId(202L)
                .alertId(303L)
                .alertType("TEMPERATURE_HIGH")
                .severity("CRITICAL")
                .message("Spindle temperature exceeded 85C threshold")
                .resolved(false)
                .alertCreatedAt(createdAt)
                .telemetryId(502L)
                .correlationId(correlationId)
                .build();

        String json = objectMapper.writeValueAsString(event);

        assertThat(json).contains("\"eventId\":\"" + eventId + "\"");
        assertThat(json).contains("\"eventType\":\"MachineAlertCreated\"");
        assertThat(json).contains("\"schemaVersion\":\"1.0\"");
        assertThat(json).contains("\"machineId\":202");
        assertThat(json).contains("\"alertId\":303");
        assertThat(json).contains("\"alertType\":\"TEMPERATURE_HIGH\"");
        assertThat(json).contains("\"severity\":\"CRITICAL\"");
        assertThat(json).contains("\"resolved\":false");
        assertThat(json).contains("\"correlationId\":\"corr-alert-create\"");
        assertThat(json).doesNotContain("password");
        assertThat(json).doesNotContain("secret");

        MachineAlertCreated deserialized = objectMapper.readValue(json, MachineAlertCreated.class);
        assertThat(deserialized.getEventId()).isEqualTo(eventId);
        assertThat(deserialized.getEventType()).isEqualTo("MachineAlertCreated");
        assertThat(deserialized.getMachineId()).isEqualTo(202L);
        assertThat(deserialized.getAlertId()).isEqualTo(303L);
        assertThat(deserialized.getSeverity()).isEqualTo("CRITICAL");
        assertThat(deserialized.isResolved()).isFalse();
    }

    @Test
    @DisplayName("Verify MachineAlertUpdated serialization and deserialization roundtrip")
    void testMachineAlertUpdatedSerialization() throws Exception {
        LocalDateTime now = LocalDateTime.of(2026, 10, 15, 12, 15, 0);
        String eventId = UUID.randomUUID().toString();

        MachineAlertUpdated event = MachineAlertUpdated.builder()
                .eventId(eventId)
                .eventType(MachineAlertUpdated.EVENT_TYPE)
                .schemaVersion(MachineAlertUpdated.SCHEMA_VERSION)
                .timestamp(now)
                .machineId(202L)
                .alertId(303L)
                .alertType("TEMPERATURE_HIGH")
                .severity("HIGH")
                .message("Updated temperature alert severity")
                .resolved(false)
                .alertCreatedAt(now.minusMinutes(10))
                .telemetryId(503L)
                .correlationId("corr-alert-update")
                .build();

        String json = objectMapper.writeValueAsString(event);

        assertThat(json).contains("\"eventType\":\"MachineAlertUpdated\"");
        assertThat(json).contains("\"severity\":\"HIGH\"");
        assertThat(json).contains("\"resolved\":false");

        MachineAlertUpdated deserialized = objectMapper.readValue(json, MachineAlertUpdated.class);
        assertThat(deserialized.getEventId()).isEqualTo(eventId);
        assertThat(deserialized.getEventType()).isEqualTo("MachineAlertUpdated");
        assertThat(deserialized.getSeverity()).isEqualTo("HIGH");
        assertThat(deserialized.isResolved()).isFalse();
    }

    @Test
    @DisplayName("Verify MachineAlertResolved serialization and deserialization roundtrip")
    void testMachineAlertResolvedSerialization() throws Exception {
        LocalDateTime now = LocalDateTime.of(2026, 10, 15, 12, 20, 0);
        String eventId = UUID.randomUUID().toString();

        MachineAlertResolved event = MachineAlertResolved.builder()
                .eventId(eventId)
                .eventType(MachineAlertResolved.EVENT_TYPE)
                .schemaVersion(MachineAlertResolved.SCHEMA_VERSION)
                .timestamp(now)
                .machineId(202L)
                .alertId(303L)
                .alertType("TEMPERATURE_HIGH")
                .severity("HIGH")
                .message("Spindle temperature returned to normal")
                .resolved(true)
                .alertCreatedAt(now.minusMinutes(20))
                .telemetryId(504L)
                .correlationId("corr-alert-resolved")
                .build();

        String json = objectMapper.writeValueAsString(event);

        assertThat(json).contains("\"eventType\":\"MachineAlertResolved\"");
        assertThat(json).contains("\"resolved\":true");

        MachineAlertResolved deserialized = objectMapper.readValue(json, MachineAlertResolved.class);
        assertThat(deserialized.getEventId()).isEqualTo(eventId);
        assertThat(deserialized.getEventType()).isEqualTo("MachineAlertResolved");
        assertThat(deserialized.isResolved()).isTrue();
    }

    @Test
    @DisplayName("Verify alias subclasses construct correctly and maintain polymorphism")
    void testAliasSubclasses() {
        MachineTelemetryRecorded tel = MachineTelemetryRecorded.builder().machineId(1L).build();
        MachineTelemetryRecordedEvent telEvent = new MachineTelemetryRecordedEvent(tel);
        assertThat(telEvent.getMachineId()).isEqualTo(1L);
        assertThat(telEvent.getEventType()).isEqualTo(MachineTelemetryRecorded.EVENT_TYPE);

        MachineAlertCreated created = MachineAlertCreated.builder().machineId(2L).build();
        MachineAlertCreatedEvent createdEvent = new MachineAlertCreatedEvent(created);
        assertThat(createdEvent.getMachineId()).isEqualTo(2L);
        assertThat(createdEvent.getEventType()).isEqualTo(MachineAlertCreated.EVENT_TYPE);

        MachineAlertUpdated updated = MachineAlertUpdated.builder().machineId(3L).build();
        MachineAlertUpdatedEvent updatedEvent = new MachineAlertUpdatedEvent(updated);
        assertThat(updatedEvent.getMachineId()).isEqualTo(3L);
        assertThat(updatedEvent.getEventType()).isEqualTo(MachineAlertUpdated.EVENT_TYPE);

        MachineAlertResolved resolved = MachineAlertResolved.builder().machineId(4L).build();
        MachineAlertResolvedEvent resolvedEvent = new MachineAlertResolvedEvent(resolved);
        assertThat(resolvedEvent.getMachineId()).isEqualTo(4L);
        assertThat(resolvedEvent.getEventType()).isEqualTo(MachineAlertResolved.EVENT_TYPE);
    }
}
