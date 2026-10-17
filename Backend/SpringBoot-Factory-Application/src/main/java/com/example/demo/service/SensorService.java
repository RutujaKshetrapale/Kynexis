package com.example.demo.service;

import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.demo.architecture.BoundedContext;
import com.example.demo.architecture.DomainBoundary;
import com.example.demo.config.CacheConfig;

import com.example.demo.dto.SensorRequest;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Sensor;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.SensorRepository;

@Service
@DomainBoundary(BoundedContext.PLANT_AND_MACHINE)
public class SensorService {

    private final SensorRepository sensorRepository;
    private final MachineRepository machineRepository;

    public SensorService(
            SensorRepository sensorRepository,
            MachineRepository machineRepository) {

        this.sensorRepository = sensorRepository;
        this.machineRepository = machineRepository;
    }

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public Sensor create(SensorRequest request) {

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "MACHINE NOT FOUND: "
                                + request.getMachineId()
                        ));

        Sensor sensor = new Sensor();

        sensor.setName(request.getName().trim());
        sensor.setType(request.getType().trim());
        sensor.setUnit(request.getUnit().trim());
        sensor.setMachine(machine);

        if (request.getActive() != null) {
            sensor.setActive(request.getActive());
        } else {
            sensor.setActive(true);
        }

        return sensorRepository.save(sensor);
    }

    public List<Sensor> getAll() {
        return sensorRepository.findAll();
    }

    public Page<Sensor> getAll(Pageable pageable) {
        return sensorRepository.findAll(pageable);
    }

    public Sensor getById(Long id) {

        return sensorRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "SENSOR NOT FOUND: " + id
                        ));
    }

    public List<Sensor> getByMachine(Long machineId) {

        if (!machineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }

        return sensorRepository.findByMachineId(machineId);
    }

    public Page<Sensor> getByMachine(
            Long machineId,
            Pageable pageable) {

        if (!machineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }

        return sensorRepository.findByMachineId(
                machineId,
                pageable
        );
    }

    public List<Sensor> getActive() {
        return sensorRepository.findByActiveTrue();
    }

    public Page<Sensor> getActive(Pageable pageable) {
        return sensorRepository.findByActiveTrue(pageable);
    }

    public List<Sensor> getInactive() {
        return sensorRepository.findByActiveFalse();
    }

    public Page<Sensor> getInactive(Pageable pageable) {
        return sensorRepository.findByActiveFalse(pageable);
    }

    public List<Sensor> getByType(String type) {
        return sensorRepository.findByTypeIgnoreCase(type);
    }

    public Page<Sensor> getByType(
            String type,
            Pageable pageable) {

        return sensorRepository.findByTypeIgnoreCase(
                type,
                pageable
        );
    }

    public List<Sensor> getByMachineAndType(
            Long machineId,
            String type) {

        if (!machineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }

        return sensorRepository
                .findByMachineIdAndTypeIgnoreCase(
                        machineId,
                        type
                );
    }

    public Page<Sensor> getByMachineAndType(
            Long machineId,
            String type,
            Pageable pageable) {

        if (!machineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException(
                    "MACHINE NOT FOUND: " + machineId
            );
        }

        return sensorRepository
                .findByMachineIdAndTypeIgnoreCase(
                        machineId,
                        type,
                        pageable
                );
    }

    public List<Sensor> searchByName(String name) {
        return sensorRepository
                .findByNameContainingIgnoreCase(name);
    }

    public Page<Sensor> searchByName(
            String name,
            Pageable pageable) {

        return sensorRepository
                .findByNameContainingIgnoreCase(
                        name,
                        pageable
                );
    }

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public Sensor update(
            Long id,
            SensorRequest request) {

        Sensor sensor = getById(id);

        Machine machine = machineRepository
                .findById(request.getMachineId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "MACHINE NOT FOUND: "
                                + request.getMachineId()
                        ));

        sensor.setName(request.getName().trim());
        sensor.setType(request.getType().trim());
        sensor.setUnit(request.getUnit().trim());
        sensor.setMachine(machine);

        if (request.getActive() != null) {
            sensor.setActive(request.getActive());
        }

        return sensorRepository.save(sensor);
    }

    @CacheEvict(value = CacheConfig.CACHE_DASHBOARD_SUMMARY, allEntries = true)
    public void delete(Long id) {

        Sensor sensor = getById(id);

        sensorRepository.delete(sensor);
    }
}