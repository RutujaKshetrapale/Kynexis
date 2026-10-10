package com.example.demo.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.demo.entity.Telemetry;

public interface TelemetryRepository
        extends JpaRepository<Telemetry, Long> {

    List<Telemetry> findByMachineId(Long machineId);

    List<Telemetry> findByMachineIdOrderByTimestampDesc(
            Long machineId
    );

    List<Telemetry> findTop10ByMachineIdOrderByTimestampDesc(
            Long machineId
    );

    List<Telemetry> findByMachineIdAndTimestampBetween(
            Long machineId,
            LocalDateTime start,
            LocalDateTime end
    );

    List<Telemetry>
    findByMachineIdAndTimestampBetweenOrderByTimestampDesc(
            Long machineId,
            LocalDateTime start,
            LocalDateTime end
    );

    Optional<Telemetry>
    findTopByMachineIdOrderByTimestampDesc(
            Long machineId
    );

    @Query("SELECT t FROM Telemetry t WHERE t.machine.id IN :machineIds AND t.id = (" +
           "SELECT MAX(t2.id) FROM Telemetry t2 WHERE t2.machine.id = t.machine.id AND t2.timestamp = (" +
           "SELECT MAX(t3.timestamp) FROM Telemetry t3 WHERE t3.machine.id = t.machine.id))")
    List<Telemetry> findLatestTelemetryByMachineIds(@Param("machineIds") List<Long> machineIds);


    List<Telemetry> findByTimestampBetween(
            LocalDateTime start,
            LocalDateTime end
    );

    long countByMachineId(Long machineId);

    // Pagination
    Page<Telemetry> findAll(Pageable pageable);

    Page<Telemetry> findByMachineId(
            Long machineId,
            Pageable pageable
    );

    Page<Telemetry>
    findByMachineIdAndTimestampBetween(
            Long machineId,
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );

    Page<Telemetry> findByTimestampBetween(
            LocalDateTime start,
            LocalDateTime end,
            Pageable pageable
    );
}