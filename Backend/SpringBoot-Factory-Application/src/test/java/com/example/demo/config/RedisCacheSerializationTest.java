package com.example.demo.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.RedisSerializer;

import com.example.demo.dto.DashboardMachineStatusResponse;
import com.example.demo.dto.DashboardSummaryResponse;

class RedisCacheSerializationTest {

    @Test
    @DisplayName("Should serialize and deserialize DashboardSummaryResponse via JSON Redis serializer")
    void shouldSerializeAndDeserializeDashboardSummaryResponse() {
        RedisSerializer<Object> serializer = RedisSerializer.json();

        DashboardSummaryResponse original = new DashboardSummaryResponse(
                5L, 20L, 18L, 50L, 3L, 1000L, 25L, 4520.5
        );

        byte[] bytes = serializer.serialize(original);
        assertNotNull(bytes);

        Object deserializedObj = serializer.deserialize(bytes);
        assertNotNull(deserializedObj);
        assertEquals(DashboardSummaryResponse.class, deserializedObj.getClass());

        DashboardSummaryResponse result = (DashboardSummaryResponse) deserializedObj;
        assertEquals(5L, result.getTotalPlants());
        assertEquals(20L, result.getTotalMachines());
        assertEquals(18L, result.getActiveMachines());
        assertEquals(50L, result.getTotalSensors());
        assertEquals(3L, result.getUnresolvedAlerts());
        assertEquals(1000L, result.getTotalProduction());
        assertEquals(25L, result.getRejectedProduction());
        assertEquals(4520.5, result.getTotalEnergyConsumption(), 0.001);
    }

    @Test
    @DisplayName("Should serialize and deserialize DashboardMachineStatusResponse via JSON Redis serializer")
    void shouldSerializeAndDeserializeDashboardMachineStatusResponse() {
        RedisSerializer<Object> serializer = RedisSerializer.json();

        DashboardMachineStatusResponse original = new DashboardMachineStatusResponse(
                12L, 4L, 2L
        );

        byte[] bytes = serializer.serialize(original);
        assertNotNull(bytes);

        Object deserializedObj = serializer.deserialize(bytes);
        assertNotNull(deserializedObj);
        assertEquals(DashboardMachineStatusResponse.class, deserializedObj.getClass());

        DashboardMachineStatusResponse result = (DashboardMachineStatusResponse) deserializedObj;
        assertEquals(12L, result.getActive());
        assertEquals(4L, result.getInactive());
        assertEquals(2L, result.getMaintenance());
    }
}
