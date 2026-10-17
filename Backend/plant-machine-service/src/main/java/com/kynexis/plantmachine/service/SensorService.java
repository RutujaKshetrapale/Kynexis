package com.kynexis.plantmachine.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.plantmachine.dto.SensorDTO;
import com.kynexis.plantmachine.dto.SensorRequest;
import com.kynexis.plantmachine.entity.Machine;
import com.kynexis.plantmachine.entity.Sensor;
import com.kynexis.plantmachine.repository.MachineRepository;
import com.kynexis.plantmachine.repository.SensorRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class SensorService {

    private final SensorRepository sensorRepository;
    private final MachineRepository machineRepository;

    public SensorService(SensorRepository sensorRepository, MachineRepository machineRepository) {
        this.sensorRepository = sensorRepository;
        this.machineRepository = machineRepository;
    }

    @Transactional
    public SensorDTO create(SensorRequest request) {
        log.info("Creating sensor name={} machineId={}", request.getName(), request.getMachineId());

        Machine machine = machineRepository.findById(request.getMachineId())
                .orElseThrow(() -> new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId()));

        Sensor sensor = Sensor.builder()
                .name(request.getName().trim())
                .type(request.getType().trim())
                .unit(request.getUnit().trim())
                .active(request.getActive() != null ? request.getActive() : true)
                .machine(machine)
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
        if (!machineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
        }
        return sensorRepository.findByMachineId(machineId).stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> getByMachine(Long machineId, Pageable pageable) {
        if (!machineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
        }
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
        if (!machineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
        }
        return sensorRepository.findByMachineIdAndTypeIgnoreCase(machineId, type)
                .stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<SensorDTO> getByMachineAndType(Long machineId, String type, Pageable pageable) {
        if (!machineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException("MACHINE NOT FOUND: " + machineId);
        }
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
        Machine machine = machineRepository.findById(request.getMachineId())
                .orElseThrow(() -> new ResourceNotFoundException("MACHINE NOT FOUND: " + request.getMachineId()));

        sensor.setName(request.getName().trim());
        sensor.setType(request.getType().trim());
        sensor.setUnit(request.getUnit().trim());
        sensor.setMachine(machine);
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
                .machineId(sensor.getMachine() != null ? sensor.getMachine().getId() : null)
                .build();
    }
}
