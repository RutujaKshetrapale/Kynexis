package com.kynexis.plantmachine.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kynexis.plantmachine.entity.Machine;

@Repository
public interface MachineRepository extends JpaRepository<Machine, Long> {

    List<Machine> findByPlantId(Long plantId);

    List<Machine> findByStatusIgnoreCase(String status);

    List<Machine> findByPlantIdAndStatusIgnoreCase(Long plantId, String status);

    List<Machine> findByNameContainingIgnoreCase(String name);

    boolean existsByPlantId(Long plantId);

    long countByPlantId(Long plantId);

    long countByStatusIgnoreCase(String status);

    Optional<Machine> findByNameIgnoreCase(String name);

    Page<Machine> findAll(Pageable pageable);

    Page<Machine> findByPlantId(Long plantId, Pageable pageable);

    Page<Machine> findByStatusIgnoreCase(String status, Pageable pageable);

    Page<Machine> findByPlantIdAndStatusIgnoreCase(Long plantId, String status, Pageable pageable);

    Page<Machine> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
