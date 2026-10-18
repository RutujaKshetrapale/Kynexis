package com.kynexis.sensor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "sensors",
    indexes = {
        @Index(name = "idx_sensor_machine", columnList = "machine_id"),
        @Index(name = "idx_sensor_active", columnList = "active")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sensor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;
}
