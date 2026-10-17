package com.kynexis.alert.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "alerts",
    indexes = {
        @Index(name = "idx_alert_machine", columnList = "machine_id"),
        @Index(name = "idx_alert_severity", columnList = "severity"),
        @Index(name = "idx_alert_resolved", columnList = "resolved"),
        @Index(name = "idx_alert_created_at", columnList = "created_at")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 30)
    private String severity;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false)
    @Builder.Default
    private boolean resolved = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;

    @Column(name = "telemetry_id")
    private Long telemetryId;
}
