package com.kynexis.plant.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.kynexis.plant.entity.Plant;

@Repository
public interface PlantRepository extends JpaRepository<Plant, Long> {

    List<Plant> findByNameContainingIgnoreCase(String name);

    Page<Plant> findByNameContainingIgnoreCase(String name, Pageable pageable);

    List<Plant> findByLocationContainingIgnoreCase(String location);

    Page<Plant> findByLocationContainingIgnoreCase(String location, Pageable pageable);

    List<Plant> findByActiveTrue();

    Page<Plant> findByActiveTrue(Pageable pageable);

    List<Plant> findByActiveFalse();

    Page<Plant> findByActiveFalse(Pageable pageable);

    boolean existsByNameIgnoreCase(String name);
}
