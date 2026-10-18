package com.kynexis.production.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.kynexis.production.entity.Production;

@Repository
public interface ProductionRepository extends JpaRepository<Production, Long> {

    List<Production> findByMachineId(Long machineId);

    List<Production> findByStatus(String status);

    Page<Production> findAll(Pageable pageable);

    Page<Production> findByMachineId(Long machineId, Pageable pageable);

    Page<Production> findByStatus(String status, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.quantityProduced), 0) FROM Production p")
    Long getTotalQuantityProduced();

    @Query("SELECT COALESCE(SUM(p.quantityRejected), 0) FROM Production p")
    Long getTotalQuantityRejected();
}
