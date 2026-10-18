package com.kynexis.energy.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.kynexis.energy.entity.Energy;

@Repository
public interface EnergyRepository extends JpaRepository<Energy, Long> {

    List<Energy> findByMachineId(Long machineId);

    Page<Energy> findAll(Pageable pageable);

    Page<Energy> findByMachineId(Long machineId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(e.energyConsumption), 0.0) FROM Energy e")
    Double getTotalEnergyConsumption();
}
