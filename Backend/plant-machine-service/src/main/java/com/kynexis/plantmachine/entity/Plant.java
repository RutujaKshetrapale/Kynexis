package com.kynexis.plantmachine.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "plants",
    indexes = {
        @Index(name = "idx_plant_location", columnList = "location"),
        @Index(name = "idx_plant_active", columnList = "active")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Plant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 150)
    private String location;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    public Plant(String name, String location, boolean active) {
        this.name = name;
        this.location = location;
        this.active = active;
    }
}
