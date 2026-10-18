package com.kynexis.sensor.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.sensor.client.MachineServiceClient;
import com.kynexis.sensor.common.exception.ResourceNotFoundException;
import com.kynexis.sensor.dto.SensorDTO;
import com.kynexis.sensor.dto.SensorRequest;
import com.kynexis.sensor.entity.Sensor;
import com.kynexis.sensor.repository.SensorRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class SensorService {

    private final SensorRepository sensorRepository;
    private final MachineServiceClient machineServiceClient;

    public SensorService(SensorRepository sensorRepository, MachineServiceClient machineServiceClient) {
        this.sensorRepository = sensorRepository;
        this.machineServiceClient = machineServiceClient;
    }

    @Transactional
    public SensorDTO create(SensorRequest request) {
        log.info("Creating sensor name={} machineId={}", request.getName(), request.getMachineId());

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            log.warn("Failed to create sensor: machine not found machineId={}", request.getMachineId());
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        Sensor sensor = Sensor.builder()
                .name(request.getName().trim())
                .type(request.getType().trim())
                .unit(request.getUnit().trim())
                .active(request.getActive() != null ? request.getActive() : true)
                .machineId(request.getMachineId())
                .build();

        Sensor saved = sensorRepository.save(sensor);
        log.info("Sensor created successfully id={} name={}", saved.getId(), saved.getName());
        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<SensorDTO> getAll() {
        return sensorRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> getAll(Pageable pageable) {
        return sensorRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public SensorDTO getById(Long id) {
        Sensor sensor = sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SENSOR NOT FOUND: " + id));
        return mapToDTO(sensor);
    }

    @Transactional(readOnly = true)
    public Sensor getEntityById(Long id) {
        return sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SENSOR NOT FOUND: " + id));
    }

    @Transactional(readOnly = true)
    public List<SensorDTO> getByMachine(Long machineId) {
        return sensorRepository.findByMachineId(machineId).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> getByMachine(Long machineId, Pageable pageable) {
        return sensorRepository.findByMachineId(machineId, pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<SensorDTO> getActive() {
        return sensorRepository.findByActiveTrue().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> getActive(Pageable pageable) {
        return sensorRepository.findByActiveTrue(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<SensorDTO> getInactive() {
        return sensorRepository.findByActiveFalse().stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> getInactive(Pageable pageable) {
        return sensorRepository.findByActiveFalse(pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<SensorDTO> getByType(String type) {
        return sensorRepository.findByTypeIgnoreCase(type).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> getByType(String type, Pageable pageable) {
        return sensorRepository.findByTypeIgnoreCase(type, pageable).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<SensorDTO> getByMachineAndType(Long machineId, String type) {
        return sensorRepository.findByMachineIdAndTypeIgnoreCase(machineId, type)
                .stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> getByMachineAndType(Long machineId, String type, Pageable pageable) {
        return sensorRepository.findByMachineIdAndTypeIgnoreCase(machineId, type, pageable)
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<SensorDTO> searchByName(String name) {
        return sensorRepository.findByNameContainingIgnoreCase(name).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> searchByName(String name, Pageable pageable) {
        return sensorRepository.findByNameContainingIgnoreCase(name, pageable).map(this::mapToDTO);
    }

    @Transactional
    public SensorDTO update(Long id, SensorRequest request) {
        log.info("Updating sensor id={} name={}", id, request.getName());

        Sensor sensor = getEntityById(id);

        if (!machineServiceClient.machineExists(request.getMachineId())) {
            log.warn("Failed to update sensor id={}: machine not found machineId={}", id, request.getMachineId());
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId());
        }

        sensor.setName(request.getName().trim());
        sensor.setType(request.getType().trim());
        sensor.setUnit(request.getUnit().trim());
        sensor.setMachineId(request.getMachineId());
        if (request.getActive() != null) {
            sensor.setActive(request.getActive());
        }

        Sensor updated = sensorRepository.save(sensor);
        log.info("Sensor updated successfully id={}", id);
        return mapToDTO(updated);
    }

    @Transactional
    public void delete(Long id) {
        log.info("Deleting sensor id={}", id);
        Sensor sensor = getEntityById(id);
        sensorRepository.delete(sensor);
        log.info("Sensor deleted successfully id={}", id);
    }

    @Transactional(readOnly = true)
    public long count() {
        return sensorRepository.count();
    }

    public SensorDTO mapToDTO(Sensor sensor) {
        if (sensor == null) return null;
        return SensorDTO.builder()
                .id(sensor.getId())
                .name(sensor.getName())
                .type(sensor.getType())
                .unit(sensor.getUnit())
                .active(sensor.isActive())
                .machineId(sensor.getMachineId())
                .build();
    }
}
