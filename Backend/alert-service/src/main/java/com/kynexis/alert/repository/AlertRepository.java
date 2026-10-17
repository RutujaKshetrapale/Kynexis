package com.kynexis.alert.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kynexis.alert.entity.Alert;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByMachineId(Long machineId);

    List<Alert> findByResolvedFalse();

    List<Alert> findBySeverity(String severity);

    Optional<Alert> findFirstByMachineIdAndTypeAndResolvedFalseOrderByCreatedAtDesc(Long machineId, String type);

    List<Alert> findByMachineIdAndTypeAndResolvedFalse(Long machineId, String type);

    List<Alert> findByMachineIdAndResolvedFalse(Long machineId);

    List<Alert> findByMachineIdInAndResolvedFalse(List<Long> machineIds);

    long countByResolvedFalse();

    long countByMachineIdAndResolvedFalse(Long machineId);

    Page<Alert> findAll(Pageable pageable);

    Page<Alert> findByMachineId(Long machineId, Pageable pageable);

    Page<Alert> findByResolvedFalse(Pageable pageable);

    Page<Alert> findBySeverity(String severity, Pageable pageable);
}
