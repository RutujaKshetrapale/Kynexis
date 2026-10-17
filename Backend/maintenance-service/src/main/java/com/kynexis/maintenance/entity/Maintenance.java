package com.kynexis.maintenance.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "maintenance",
    indexes = {
        @Index(name = "idx_maintenance_machine", columnList = "machine_id"),
        @Index(name = "idx_maintenance_status", columnList = "status"),
        @Index(name = "idx_maintenance_scheduled", columnList = "scheduled_date")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Maintenance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(nullable = false, length = 100)
    private String technician;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;
}
