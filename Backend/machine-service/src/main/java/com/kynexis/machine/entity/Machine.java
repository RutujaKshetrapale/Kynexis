package com.kynexis.machine.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "machines",
    indexes = {
        @Index(name = "idx_machine_plant", columnList = "plant_id"),
        @Index(name = "idx_machine_status", columnList = "status")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Machine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String type;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "plant_id", nullable = false)
    private Long plantId;
}
