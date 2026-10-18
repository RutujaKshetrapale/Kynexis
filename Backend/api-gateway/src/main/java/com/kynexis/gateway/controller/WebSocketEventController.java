package com.kynexis.gateway.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kynexis.gateway.dto.event.FactoryEventDTO.AlertPayload;
import com.kynexis.gateway.dto.event.FactoryEventDTO.MachineStatusPayload;
import com.kynexis.gateway.dto.event.FactoryEventDTO.MaintenancePayload;
import com.kynexis.gateway.dto.event.FactoryEventDTO.TelemetryPayload;
import com.kynexis.gateway.service.WebSocketEventPublisherService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/gateway/internal/events")
public class WebSocketEventController {

    private final WebSocketEventPublisherService publisherService;

    public WebSocketEventController(WebSocketEventPublisherService publisherService) {
        this.publisherService = publisherService;
    }

    @PostMapping("/status")
    public ResponseEntity<Void> broadcastMachineStatus(@RequestBody MachineStatusPayload payload) {
        publisherService.publishMachineStatus(payload);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/telemetry")
    public ResponseEntity<Void> broadcastTelemetry(@RequestBody TelemetryPayload payload) {
        publisherService.publishTelemetry(payload);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/alert")
    public ResponseEntity<Void> broadcastAlert(@RequestBody AlertPayload payload) {
        publisherService.publishAlert(payload);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/maintenance")
    public ResponseEntity<Void> broadcastMaintenance(@RequestBody MaintenancePayload payload) {
        publisherService.publishMaintenance(payload);
        return ResponseEntity.ok().build();
    }
}
