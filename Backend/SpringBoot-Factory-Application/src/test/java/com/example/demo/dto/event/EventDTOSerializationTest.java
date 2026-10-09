package com.example.demo.dto.event;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

class EventDTOSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("Verify FactoryEventDTO serialization with payload")
    void testFactoryEventDTOSerialization() throws Exception {
        LocalDateTime now = LocalDateTime.of(2026, 10, 9, 20, 0, 0);

        FactoryEventDTO<String> event = FactoryEventDTO.<String>builder()
                .eventType("MACHINE_STATUS_UPDATED")
                .timestamp(now)
                .machineId(101L)
                .requestId("req-12345")
                .payload("RUNNING")
                .build();

        String json = objectMapper.writeValueAsString(event);

        assertThat(json).contains("\"eventType\":\"MACHINE_STATUS_UPDATED\"");
        assertThat(json).contains("\"machineId\":101");
        assertThat(json).contains("\"requestId\":\"req-12345\"");
        assertThat(json).contains("\"payload\":\"RUNNING\"");
        assertThat(json).doesNotContain("password");
        assertThat(json).doesNotContain("secret");
    }

    @Test
    @DisplayName("Verify FactoryEventDTO deserialization")
    void testFactoryEventDTODeserialization() throws Exception {
        String json = """
                {
                    "eventType": "TELEMETRY_RECORDED",
                    "machineId": 202,
                    "requestId": "req-999",
                    "payload": "data"
                }
                """;

        FactoryEventDTO<?> event = objectMapper.readValue(json, FactoryEventDTO.class);

        assertThat(event.getEventType()).isEqualTo("TELEMETRY_RECORDED");
        assertThat(event.getMachineId()).isEqualTo(202L);
        assertThat(event.getRequestId()).isEqualTo("req-999");
        assertThat(event.getPayload()).isEqualTo("data");
    }
}
