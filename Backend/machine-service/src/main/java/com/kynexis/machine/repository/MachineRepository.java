package com.kynexis.machine.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kynexis.machine.entity.Machine;

@Repository
public interface MachineRepository extends JpaRepository<Machine, Long> {

    List<Machine> findByPlantId(Long plantId);

    Page<Machine> findByPlantId(Long plantId, Pageable pageable);

    List<Machine> findByStatusIgnoreCase(String status);

    Page<Machine> findByStatusIgnoreCase(String status, Pageable pageable);

    List<Machine> findByPlantIdAndStatusIgnoreCase(Long plantId, String status);

    Page<Machine> findByPlantIdAndStatusIgnoreCase(Long plantId, String status, Pageable pageable);

    List<Machine> findByNameContainingIgnoreCase(String name);

    Page<Machine> findByNameContainingIgnoreCase(String name, Pageable pageable);

    long countByStatusIgnoreCase(String status);
}
