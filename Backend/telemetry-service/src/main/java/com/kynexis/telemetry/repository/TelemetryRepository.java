package com.kynexis.telemetry.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.kynexis.telemetry.entity.Telemetry;

@Repository
public interface TelemetryRepository extends JpaRepository<Telemetry, Long> {

    List<Telemetry> findByMachineId(Long machineId);

    List<Telemetry> findByMachineIdOrderByTimestampDesc(Long machineId);

    List<Telemetry> findTop10ByMachineIdOrderByTimestampDesc(Long machineId);

    List<Telemetry> findByMachineIdAndTimestampBetween(Long machineId, LocalDateTime start, LocalDateTime end);

    List<Telemetry> findByMachineIdAndTimestampBetweenOrderByTimestampDesc(Long machineId, LocalDateTime start, LocalDateTime end);

    Optional<Telemetry> findTopByMachineIdOrderByTimestampDesc(Long machineId);

    Optional<Telemetry> findFirstByMachineIdOrderByTimestampDescIdDesc(Long machineId);

    @Query("SELECT t FROM Telemetry t WHERE t.machineId IN :machineIds AND t.id = (" +
           "SELECT MAX(t2.id) FROM Telemetry t2 WHERE t2.machineId = t.machineId AND t2.timestamp = (" +
           "SELECT MAX(t3.timestamp) FROM Telemetry t3 WHERE t3.machineId = t.machineId))")
    List<Telemetry> findLatestTelemetryByMachineIds(@Param("machineIds") List<Long> machineIds);

    @Query("SELECT t FROM Telemetry t WHERE t.machineId IN :machineIds " +
           "AND (:since IS NULL OR t.timestamp >= :since) " +
           "ORDER BY t.timestamp DESC, t.id DESC")
    List<Telemetry> findRecentTelemetriesByMachineIds(
            @Param("machineIds") List<Long> machineIds,
            @Param("since") LocalDateTime since
    );

    List<Telemetry> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    long countByMachineId(Long machineId);

    Page<Telemetry> findAll(Pageable pageable);

    Page<Telemetry> findByMachineId(Long machineId, Pageable pageable);

    Page<Telemetry> findByMachineIdAndTimestampBetween(Long machineId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<Telemetry> findByTimestampBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}
