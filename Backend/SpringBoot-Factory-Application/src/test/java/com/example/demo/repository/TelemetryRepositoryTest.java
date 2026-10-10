package com.example.demo.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.example.demo.entity.Machine;
import com.example.demo.entity.Plant;
import com.example.demo.entity.Telemetry;

@DataJpaTest
class TelemetryRepositoryTest {

    @Autowired
    private TelemetryRepository telemetryRepository;

    @Autowired
    private MachineRepository machineRepository;

    @Autowired
    private PlantRepository plantRepository;

    // =========================
    // SAVE TELEMETRY
    // =========================

    @Test
    @DisplayName("Should save telemetry successfully")
    void shouldSaveTelemetrySuccessfully() {

        Machine machine = createMachine();

        Telemetry telemetry =
                createTelemetry(
                        machine,
                        LocalDateTime.of(
                                2026,
                                9,
                                1,
                                10,
                                0
                        )
                );

        Telemetry savedTelemetry =
                telemetryRepository.save(
                        telemetry
                );

        assertTrue(
                savedTelemetry.getId() > 0
        );

        assertEquals(
                75.5,
                savedTelemetry.getTemperature()
        );

    }

    // =========================
    // FIND BY MACHINE
    // =========================

    @Test
    @DisplayName("Should find telemetry by machine successfully")
    void shouldFindTelemetryByMachineSuccessfully() {

        Machine machine = createMachine();

        telemetryRepository.save(
                createTelemetry(
                        machine,
                        LocalDateTime.now()
                )
        );

        List<Telemetry> result =
                telemetryRepository.findByMachineId(
                        machine.getId()
                );

        assertEquals(
                1,
                result.size()
        );

    }

    // =========================
    // FIND BY DATE RANGE
    // =========================

    @Test
    @DisplayName("Should find telemetry by date range successfully")
    void shouldFindTelemetryByDateRangeSuccessfully() {

        Machine machine = createMachine();

        LocalDateTime timestamp =
                LocalDateTime.of(
                        2026,
                        9,
                        1,
                        10,
                        0
                );

        telemetryRepository.save(
                createTelemetry(
                        machine,
                        timestamp
                )
        );

        List<Telemetry> result =
                telemetryRepository
                        .findByMachineIdAndTimestampBetween(
                                machine.getId(),
                                timestamp.minusHours(1),
                                timestamp.plusHours(1)
                        );

        assertEquals(
                1,
                result.size()
        );

    }

    // =========================
    // FIND LATEST
    // =========================

    @Test
    @DisplayName("Should find latest telemetry successfully")
    void shouldFindLatestTelemetrySuccessfully() {

        Machine machine = createMachine();

        telemetryRepository.save(
                createTelemetry(
                        machine,
                        LocalDateTime.of(
                                2026,
                                9,
                                1,
                                10,
                                0
                        )
                )
        );

        telemetryRepository.save(
                createTelemetry(
                        machine,
                        LocalDateTime.of(
                                2026,
                                9,
                                1,
                                11,
                                0
                        )
                )
        );

        List<Telemetry> result =
                telemetryRepository
                        .findTop10ByMachineIdOrderByTimestampDesc(
                                machine.getId()
                        );

        assertEquals(
                2,
                result.size()
        );

        assertEquals(
                11,
                result.get(0)
                        .getTimestamp()
                        .getHour()
        );

    }

    @Test
    @DisplayName("Should find latest telemetry by machine IDs selecting maximum timestamp regardless of insertion order")
    void shouldFindLatestTelemetryByMachineIds_withOutOfOrderTimestamps() {
        Machine m1 = createMachine();
        Machine m2 = createMachine();

        // Machine 1 telemetries saved out of timestamp order:
        // Record 1: 10:00 (saved first)
        // Record 2: 16:00 (saved second -> latest timestamp!)
        // Record 3: 12:00 (saved third -> higher ID than 16:00 record, but earlier timestamp!)
        telemetryRepository.save(createTelemetryWithTemp(m1, LocalDateTime.of(2026, 10, 10, 10, 0), 50.0));
        Telemetry tLatestM1 = telemetryRepository.save(createTelemetryWithTemp(m1, LocalDateTime.of(2026, 10, 10, 16, 0), 95.0));
        telemetryRepository.save(createTelemetryWithTemp(m1, LocalDateTime.of(2026, 10, 10, 12, 0), 70.0));

        // Machine 2 telemetries
        telemetryRepository.save(createTelemetryWithTemp(m2, LocalDateTime.of(2026, 10, 10, 9, 0), 30.0));
        Telemetry tLatestM2 = telemetryRepository.save(createTelemetryWithTemp(m2, LocalDateTime.of(2026, 10, 10, 15, 0), 80.0));

        List<Telemetry> results = telemetryRepository.findLatestTelemetryByMachineIds(List.of(m1.getId(), m2.getId()));

        assertEquals(2, results.size());

        Telemetry m1Result = results.stream().filter(t -> t.getMachine().getId().equals(m1.getId())).findFirst().orElseThrow();
        assertEquals(LocalDateTime.of(2026, 10, 10, 16, 0), m1Result.getTimestamp());
        assertEquals(95.0, m1Result.getTemperature());
        assertEquals(tLatestM1.getId(), m1Result.getId());

        Telemetry m2Result = results.stream().filter(t -> t.getMachine().getId().equals(m2.getId())).findFirst().orElseThrow();
        assertEquals(LocalDateTime.of(2026, 10, 10, 15, 0), m2Result.getTimestamp());
        assertEquals(80.0, m2Result.getTemperature());
        assertEquals(tLatestM2.getId(), m2Result.getId());
    }

    // =========================
    // PAGINATION
    // =========================

    @Test
    @DisplayName("Should get paginated telemetry successfully")
    void shouldGetPaginatedTelemetrySuccessfully() {

        Machine machine = createMachine();

        telemetryRepository.save(
                createTelemetry(
                        machine,
                        LocalDateTime.now()
                )
        );

        Page<Telemetry> result =
                telemetryRepository.findAll(
                        PageRequest.of(0, 10)
                );

        assertEquals(
                1,
                result.getTotalElements()
        );

    }

    // =========================
    // HELPER METHODS
    // =========================

    private Machine createMachine() {

        Plant plant =
                plantRepository.save(
                        new Plant(
                                "Pune Plant",
                                "Pune",
                                true
                        )
                );

        Machine machine = new Machine();

        machine.setName("CNC Machine");
        machine.setType("CNC");
        machine.setStatus("ACTIVE");
        machine.setPlant(plant);

        return machineRepository.save(machine);
    }

    private Telemetry createTelemetry(
            Machine machine,
            LocalDateTime timestamp) {
        return createTelemetryWithTemp(machine, timestamp, 75.5);
    }

    private Telemetry createTelemetryWithTemp(
            Machine machine,
            LocalDateTime timestamp,
            double temperature) {

        Telemetry telemetry =
                new Telemetry();

        telemetry.setTemperature(temperature);
        telemetry.setVibration(2.5);
        telemetry.setPressure(10.5);
        telemetry.setRpm(1500.0);
        telemetry.setTimestamp(timestamp);
        telemetry.setMachine(machine);

        return telemetry;
    }

}