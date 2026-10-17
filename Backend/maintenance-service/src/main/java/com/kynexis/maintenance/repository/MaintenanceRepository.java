package com.kynexis.maintenance.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kynexis.maintenance.entity.Maintenance;

@Repository
public interface MaintenanceRepository extends JpaRepository<Maintenance, Long> {

    List<Maintenance> findByMachineId(Long machineId);

    List<Maintenance> findByMachineIdIn(List<Long> machineIds);

    List<Maintenance> findByStatus(String status);

    List<Maintenance> findByStatusOrderByScheduledDateAsc(String status);

    Page<Maintenance> findAll(Pageable pageable);

    Page<Maintenance> findByMachineId(Long machineId, Pageable pageable);

    Page<Maintenance> findByStatus(String status, Pageable pageable);

    Page<Maintenance> findByStatusOrderByScheduledDateAsc(String status, Pageable pageable);
}
