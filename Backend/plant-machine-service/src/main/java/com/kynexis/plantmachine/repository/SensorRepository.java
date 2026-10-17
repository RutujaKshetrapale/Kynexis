package com.kynexis.plantmachine.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kynexis.plantmachine.entity.Sensor;

@Repository
public interface SensorRepository extends JpaRepository<Sensor, Long> {

    List<Sensor> findByMachineId(Long machineId);

    List<Sensor> findByActiveTrue();

    List<Sensor> findByActiveFalse();

    List<Sensor> findByMachineIdAndActiveTrue(Long machineId);

    List<Sensor> findByTypeIgnoreCase(String type);

    List<Sensor> findByMachineIdAndTypeIgnoreCase(Long machineId, String type);

    List<Sensor> findByNameContainingIgnoreCase(String name);

    long countByMachineId(Long machineId);

    long countByActiveTrue();

    Page<Sensor> findAll(Pageable pageable);

    Page<Sensor> findByMachineId(Long machineId, Pageable pageable);

    Page<Sensor> findByActiveTrue(Pageable pageable);

    Page<Sensor> findByActiveFalse(Pageable pageable);

    Page<Sensor> findByTypeIgnoreCase(String type, Pageable pageable);

    Page<Sensor> findByMachineIdAndTypeIgnoreCase(Long machineId, String type, Pageable pageable);

    Page<Sensor> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
