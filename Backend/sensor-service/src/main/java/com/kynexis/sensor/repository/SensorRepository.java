package com.kynexis.sensor.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kynexis.sensor.entity.Sensor;

@Repository
public interface SensorRepository extends JpaRepository<Sensor, Long> {

    List<Sensor> findByMachineId(Long machineId);

    Page<Sensor> findByMachineId(Long machineId, Pageable pageable);

    List<Sensor> findByActiveTrue();

    Page<Sensor> findByActiveTrue(Pageable pageable);

    List<Sensor> findByActiveFalse();

    Page<Sensor> findByActiveFalse(Pageable pageable);

    List<Sensor> findByTypeIgnoreCase(String type);

    Page<Sensor> findByTypeIgnoreCase(String type, Pageable pageable);

    List<Sensor> findByMachineIdAndTypeIgnoreCase(Long machineId, String type);

    Page<Sensor> findByMachineIdAndTypeIgnoreCase(Long machineId, String type, Pageable pageable);

    List<Sensor> findByNameContainingIgnoreCase(String name);

    Page<Sensor> findByNameContainingIgnoreCase(String name, Pageable pageable);
}
