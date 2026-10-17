package com.kynexis.production.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "energy",
    indexes = {
        @Index(name = "idx_energy_machine", columnList = "machine_id"),
        @Index(name = "idx_energy_recorded_at", columnList = "recorded_at"),
        @Index(name = "idx_energy_machine_recorded", columnList = "machine_id,recorded_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Energy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;

    @Column(nullable = false)
    private Double energyConsumption;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;
}
