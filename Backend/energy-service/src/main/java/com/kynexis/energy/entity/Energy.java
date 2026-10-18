package com.kynexis.energy.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
