package com.kynexis.production.entity;

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
    name = "production",
    indexes = {
        @Index(name = "idx_production_machine", columnList = "machine_id"),
        @Index(name = "idx_production_status", columnList = "status"),
        @Index(name = "idx_production_start", columnList = "production_start")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Production {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "machine_id", nullable = false)
    private Long machineId;

    @Column(nullable = false, length = 100)
    private String productName;

    @Column(nullable = false)
    private Integer quantityProduced;

    @Column(nullable = false)
    private Integer quantityRejected;

    @Column(nullable = false)
    private LocalDateTime productionStart;

    @Column(name = "production_end")
    private LocalDateTime productionEnd;

    @Column(nullable = false, length = 30)
    private String status;
}
