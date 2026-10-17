package com.kynexis.telemetry.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "telemetry",
    indexes = {
        @Index(name = "idx_telemetry_machine", columnList = "machine_id"),
        @Index(name = "idx_telemetry_timestamp", columnList = "timestamp"),
        @Index(name = "idx_telemetry_machine_timestamp", columnList = "machine_id,timestamp")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Telemetry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double temperature;

    @Column(nullable = false)
    private Double vibration;

    @Column(nullable = false)
    private Double pressure;

    @Column(nullable = false)
    private Double rpm;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;
}
