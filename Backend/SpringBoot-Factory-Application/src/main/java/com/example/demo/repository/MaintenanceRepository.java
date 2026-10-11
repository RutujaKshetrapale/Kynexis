package com.example.demo.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.entity.Maintenance;

public interface MaintenanceRepository
        extends JpaRepository<Maintenance, Long> {

    // Existing queries
    List<Maintenance> findByMachineId(Long machineId);

    List<Maintenance> findByMachineIdIn(List<Long> machineIds);

    List<Maintenance> findByStatus(String status);

    List<Maintenance> findByStatusOrderByScheduledDateAsc(
            String status
    );

    // Pagination
    Page<Maintenance> findAll(Pageable pageable);

    Page<Maintenance> findByMachineId(
            Long machineId,
            Pageable pageable
    );

    Page<Maintenance> findByStatus(
            String status,
            Pageable pageable
    );

    Page<Maintenance> findByStatusOrderByScheduledDateAsc(
            String status,
            Pageable pageable
    );
}