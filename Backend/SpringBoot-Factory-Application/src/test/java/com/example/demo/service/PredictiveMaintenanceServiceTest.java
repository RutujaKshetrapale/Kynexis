package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.example.demo.config.PredictiveMaintenanceProperties;
import com.example.demo.dto.PredictiveMaintenanceResponse;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Maintenance;
import com.example.demo.entity.Telemetry;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.DataSufficiency;
import com.example.demo.model.MaintenanceRiskCategory;
import com.example.demo.repository.AlertRepository;
import com.example.demo.repository.MachineRepository;
import com.example.demo.repository.MaintenanceRepository;
import com.example.demo.repository.TelemetryRepository;

@ExtendWith(MockitoExtension.class)
class PredictiveMaintenanceServiceTest {

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private TelemetryRepository telemetryRepository;

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private MaintenanceRepository maintenanceRepository;

    @Spy
    private PredictiveMaintenanceProperties properties = new PredictiveMaintenanceProperties();

    @InjectMocks
    private PredictiveMaintenanceService service;

    private Machine machine1;
    private Machine machine2;
    private LocalDateTime baseTime;

    @BeforeEach
    void setUp() {
        baseTime = LocalDateTime.of(2026, 10, 11, 14, 0, 0);

        machine1 = new Machine();
        machine1.setName("CNC Milling Alpha");
        machine1.setType("CNC");
        machine1.setStatus("RUNNING");
        setMachineId(machine1, 1L);

        machine2 = new Machine();
        machine2.setName("Robotic Welder Beta");
        machine2.setType("WELDER");
        machine2.setStatus("RUNNING");
        setMachineId(machine2, 2L);
    }

    private void setMachineId(Machine machine, Long id) {
        try {
            var field = Machine.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(machine, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Telemetry createTelemetry(Machine machine, double temp, double vib, double press, double rpm, LocalDateTime time, Long id) {
        Telemetry t = new Telemetry();
        t.setMachine(machine);
        t.setTemperature(temp);
        t.setVibration(vib);
        t.setPressure(press);
        t.setRpm(rpm);
        t.setTimestamp(time);
        try {
            var field = Telemetry.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(t, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return t;
    }

    private Alert createAlert(Machine machine, String type, String severity, String message, boolean resolved) {
        Alert a = new Alert();
        a.setMachine(machine);
        a.setType(type);
        a.setSeverity(severity);
        a.setMessage(message);
        a.setResolved(resolved);
        a.setCreatedAt(LocalDateTime.now().minusHours(1));
        return a;
    }

    // =========================================================================
    // Scenario 1: Sufficient, Stable Telemetry -> NORMAL
    // =========================================================================
    @Test
    @DisplayName("Scenario 1: Sufficient, stable telemetry produces NORMAL maintenance risk")
    void shouldReturnNormalWhenTelemetryIsSufficientFreshAndStable() {
        LocalDateTime now = LocalDateTime.now();
        List<Telemetry> telemetries = List.of(
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(40), 1L),
                createTelemetry(machine1, 70.2, 1.1, 45.1, 2005.0, now.minusMinutes(30), 2L),
                createTelemetry(machine1, 70.1, 1.0, 45.0, 1995.0, now.minusMinutes(20), 3L),
                createTelemetry(machine1, 70.3, 1.2, 45.2, 2000.0, now.minusMinutes(10), 4L),
                createTelemetry(machine1, 70.2, 1.1, 45.0, 2002.0, now, 5L)
        );

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(telemetries));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(telemetries.get(4)));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertNotNull(response);
        assertEquals(1L, response.getMachineId());
        assertEquals("NORMAL", response.getRiskCategory());
        assertEquals("SUFFICIENT", response.getDataSufficiency());
        assertFalse(response.isTelemetryStale());
        assertEquals(5, response.getEvaluatedReadingsCount());
        assertEquals(0, response.getTotalUnresolvedAlertCount());
        assertTrue(response.getTrendFindings().get(0).contains("stable across evaluated window"));
        assertTrue(response.getRecommendedAction().contains("No immediate maintenance action required"));
        assertNotNull(response.getAdvisoryNotice());
    }

    // =========================================================================
    // Scenario 2: Sustained Thermal & Vibration Trend -> MAINTENANCE_RECOMMENDED
    // =========================================================================
    @Test
    @DisplayName("Scenario 2: Sustained thermal and vibration increase produces MAINTENANCE_RECOMMENDED")
    void shouldReturnMaintenanceRecommendedWhenSustainedThermalAndVibrationIncrease() {
        LocalDateTime now = LocalDateTime.now();
        List<Telemetry> telemetries = List.of(
                createTelemetry(machine1, 70.0, 1.2, 45.0, 2000.0, now.minusMinutes(30), 1L),
                createTelemetry(machine1, 76.5, 2.5, 45.5, 2000.0, now.minusMinutes(20), 2L),
                createTelemetry(machine1, 82.0, 3.8, 46.0, 2000.0, now.minusMinutes(10), 3L),
                createTelemetry(machine1, 89.0, 5.5, 46.2, 2000.0, now, 4L)
        );

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(telemetries));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(telemetries.get(3)));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertEquals("MAINTENANCE_RECOMMENDED", response.getRiskCategory());
        assertEquals("SUFFICIENT", response.getDataSufficiency());
        assertEquals(4, response.getEvaluatedReadingsCount());
        assertTrue(response.getTrendFindings().stream().anyMatch(f -> f.contains("Sustained temperature increase")));
        assertTrue(response.getTrendFindings().stream().anyMatch(f -> f.contains("Sustained vibration increase")));
        assertTrue(response.getRecommendedAction().contains("Recommend scheduling qualified mechanical inspection"));
    }

    // =========================================================================
    // Scenario 3: Single Sensor Channel Drift -> WATCH
    // =========================================================================
    @Test
    @DisplayName("Scenario 3: Single channel thermal drift produces WATCH risk category")
    void shouldReturnWatchWhenSingleChannelDriftsWithoutCriticalAlert() {
        LocalDateTime now = LocalDateTime.now();
        List<Telemetry> telemetries = List.of(
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(30), 1L),
                createTelemetry(machine1, 76.0, 1.1, 45.0, 2000.0, now.minusMinutes(20), 2L),
                createTelemetry(machine1, 82.5, 1.0, 45.0, 2000.0, now.minusMinutes(10), 3L)
        );

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(telemetries));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(telemetries.get(2)));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertEquals("WATCH", response.getRiskCategory());
        assertEquals("SUFFICIENT", response.getDataSufficiency());
        assertTrue(response.getRecommendedAction().contains("Recommend increased monitoring frequency"));
    }

    // =========================================================================
    // Scenario 4: Insufficient Historical Telemetry (< 3 readings)
    // =========================================================================
    @Test
    @DisplayName("Scenario 4: Insufficient historical telemetry produces INSUFFICIENT_DATA")
    void shouldReturnInsufficientDataWhenReadingsAreFewerThanMinimum() {
        LocalDateTime now = LocalDateTime.now();
        List<Telemetry> telemetries = List.of(
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(10), 1L),
                createTelemetry(machine1, 71.0, 1.1, 45.0, 2000.0, now, 2L)
        );

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(telemetries));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(telemetries.get(1)));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertEquals("INSUFFICIENT_DATA", response.getRiskCategory());
        assertEquals("INSUFFICIENT_DATA", response.getDataSufficiency());
        assertEquals(2, response.getEvaluatedReadingsCount());
        assertTrue(response.getExplanation().contains("Historical telemetry volume is insufficient"));
        assertTrue(response.getRecommendedAction().contains("Collect additional telemetry readings"));
    }

    // =========================================================================
    // Scenario 5: Missing Telemetry (0 readings)
    // =========================================================================
    @Test
    @DisplayName("Scenario 5: Missing telemetry produces INSUFFICIENT_DATA and NO_DATA sufficiency")
    void shouldReturnInsufficientDataWhenMissingTelemetry() {
        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.empty());
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertEquals("INSUFFICIENT_DATA", response.getRiskCategory());
        assertEquals("NO_DATA", response.getDataSufficiency());
        assertNull(response.getLatestTelemetryTimestamp());
        assertEquals(0, response.getEvaluatedReadingsCount());
        assertTrue(response.getEvidence().get(0).contains("No telemetry data has been recorded"));
        assertTrue(response.getRecommendedAction().contains("Verify telemetry transmission"));
    }

    // =========================================================================
    // Scenario 6: Stale Telemetry (> 24 hours)
    // =========================================================================
    @Test
    @DisplayName("Scenario 6: Stale telemetry produces INSUFFICIENT_DATA and STALE_DATA sufficiency")
    void shouldReturnInsufficientDataWhenTelemetryIsStaleWithoutAlerts() {
        LocalDateTime oldTime = LocalDateTime.now().minusHours(48);
        Telemetry oldTelemetry = createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, oldTime, 1L);

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(oldTelemetry)));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(oldTelemetry));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertEquals("INSUFFICIENT_DATA", response.getRiskCategory());
        assertEquals("STALE_DATA", response.getDataSufficiency());
        assertTrue(response.isTelemetryStale());
        assertTrue(response.getEvidence().get(0).contains("Telemetry data is stale"));
        assertTrue(response.getRecommendedAction().contains("Verify sensor freshness or sensor operation"));
    }

    // =========================================================================
    // Scenario 7: Unresolved High / Critical Alerts
    // =========================================================================
    @Test
    @DisplayName("Scenario 7: Unresolved critical alert produces MAINTENANCE_RECOMMENDED")
    void shouldReturnMaintenanceRecommendedWhenUnresolvedCriticalAlertExists() {
        LocalDateTime now = LocalDateTime.now();
        List<Telemetry> telemetries = List.of(
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(30), 1L),
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(20), 2L),
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now, 3L)
        );
        Alert criticalAlert = createAlert(machine1, "OVERHEATING", "CRITICAL", "Critical temperature safety breach", false);

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(telemetries));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(telemetries.get(2)));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of(criticalAlert));
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertEquals("MAINTENANCE_RECOMMENDED", response.getRiskCategory());
        assertEquals(1, response.getCriticalAlertCount());
        assertEquals(1, response.getTotalUnresolvedAlertCount());
        assertTrue(response.getEvidence().stream().anyMatch(e -> e.contains("CRITICAL")));
    }

    @Test
    @DisplayName("Scenario 7b: Unresolved high alert with stable telemetry produces WATCH")
    void shouldReturnWatchWhenUnresolvedHighAlertExistsWithStableTelemetry() {
        LocalDateTime now = LocalDateTime.now();
        List<Telemetry> telemetries = List.of(
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(30), 1L),
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(20), 2L),
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now, 3L)
        );
        Alert highAlert = createAlert(machine1, "TEMPERATURE_HIGH", "HIGH", "Temperature approached threshold", false);

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(telemetries));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(telemetries.get(2)));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of(highAlert));
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertEquals("WATCH", response.getRiskCategory());
        assertEquals(1, response.getHighAlertCount());
        assertEquals(1, response.getTotalUnresolvedAlertCount());
    }

    // =========================================================================
    // Scenario 8: Healthy Current Status But Insufficient Trend Data
    // =========================================================================
    @Test
    @DisplayName("Scenario 8: Healthy current status but only 1 reading produces INSUFFICIENT_DATA, not NORMAL")
    void shouldReturnInsufficientDataWhenHealthyCurrentStatusButInsufficientTrendData() {
        LocalDateTime now = LocalDateTime.now();
        Telemetry singleHealthyReading = createTelemetry(machine1, 65.0, 0.9, 45.0, 2000.0, now, 1L);

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(singleHealthyReading)));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(singleHealthyReading));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        // Crucial test: missing trend data must NOT imply machine is healthy/NORMAL
        assertEquals("INSUFFICIENT_DATA", response.getRiskCategory());
        assertEquals("INSUFFICIENT_DATA", response.getDataSufficiency());
        assertEquals(1, response.getEvaluatedReadingsCount());
        assertTrue(response.getEvidence().stream().anyMatch(e -> e.contains("Insufficient historical telemetry")));
    }

    // =========================================================================
    // Scenario 9: Existing Scheduled Maintenance Incorporated Into Assessment
    // =========================================================================
    @Test
    @DisplayName("Scenario 9: Existing scheduled maintenance is referenced in evidence and recommended action")
    void shouldIncorporateExistingScheduledMaintenance() {
        LocalDateTime now = LocalDateTime.now();
        List<Telemetry> telemetries = List.of(
                createTelemetry(machine1, 70.0, 1.2, 45.0, 2000.0, now.minusMinutes(30), 1L),
                createTelemetry(machine1, 78.0, 2.8, 45.5, 2000.0, now.minusMinutes(20), 2L),
                createTelemetry(machine1, 88.0, 5.0, 46.0, 2000.0, now, 3L)
        );

        Maintenance m = new Maintenance();
        m.setMachine(machine1);
        m.setType("PREVENTIVE");
        m.setDescription("Quarterly bearing check");
        m.setScheduledDate(LocalDate.of(2026, 10, 20));
        m.setStatus("SCHEDULED");
        m.setTechnician("Alice Johnson");

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(telemetries));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(telemetries.get(2)));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of(m));

        PredictiveMaintenanceResponse response = service.getMachineAssessment(1L);

        assertTrue(response.isMaintenanceScheduled());
        assertNotNull(response.getExistingMaintenanceSummary());
        assertTrue(response.getExistingMaintenanceSummary().contains("2026-10-20"));
        assertTrue(response.getRecommendedAction().contains("expediting or aligning"));
    }

    // =========================================================================
    // Scenario 10: Unknown Machine ID Throws ResourceNotFoundException (404)
    // =========================================================================
    @Test
    @DisplayName("Scenario 10: Unknown machine ID throws ResourceNotFoundException")
    void shouldThrowResourceNotFoundExceptionWhenMachineNotFound() {
        when(machineRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getMachineAssessment(999L));
    }

    // =========================================================================
    // Scenario 11: Read-Only Verification (No Side Effects)
    // =========================================================================
    @Test
    @DisplayName("Scenario 11: Read-only assessment preserves all existing records without mutations")
    void shouldPreserveRecordsWithoutMutatingDatabase() {
        LocalDateTime now = LocalDateTime.now();
        List<Telemetry> telemetries = List.of(
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(20), 1L),
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(10), 2L),
                createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now, 3L)
        );

        when(machineRepository.findById(1L)).thenReturn(Optional.of(machine1));
        when(telemetryRepository.findByMachineId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(telemetries));
        when(telemetryRepository.findFirstByMachineIdOrderByTimestampDescIdDesc(1L))
                .thenReturn(Optional.of(telemetries.get(2)));
        when(alertRepository.findByMachineIdAndResolvedFalse(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        service.getMachineAssessment(1L);

        verify(machineRepository, never()).save(any());
        verify(telemetryRepository, never()).save(any());
        verify(alertRepository, never()).save(any());
        verify(alertRepository, never()).delete(any());
        verify(maintenanceRepository, never()).save(any());
    }

    // =========================================================================
    // Scenario 12: Bulk Pagination & No N+1 Queries
    // =========================================================================
    @Test
    @DisplayName("Scenario 12: Bulk assessments execute batch queries without N+1 regression")
    void shouldExecuteBulkAssessmentsWithoutNPlusOneQueries() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Machine> machinePage = new PageImpl<>(List.of(machine1, machine2), pageable, 2);

        LocalDateTime now = LocalDateTime.now();
        Telemetry t1 = createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now, 1L);
        Telemetry t2 = createTelemetry(machine2, 85.0, 4.0, 50.0, 2200.0, now, 2L);

        when(machineRepository.findAll(pageable)).thenReturn(machinePage);
        when(telemetryRepository.findLatestTelemetryByMachineIds(List.of(1L, 2L))).thenReturn(List.of(t1, t2));
        when(alertRepository.findByMachineIdInAndResolvedFalse(List.of(1L, 2L))).thenReturn(List.of());
        when(maintenanceRepository.findByMachineIdIn(List.of(1L, 2L))).thenReturn(List.of());
        when(telemetryRepository.findRecentTelemetriesByMachineIds(eq(List.of(1L, 2L)), any())).thenReturn(List.of(t1, t2));

        Page<PredictiveMaintenanceResponse> results = service.getBulkAssessments(pageable, null);

        assertNotNull(results);
        assertEquals(2, results.getContent().size());

        // Verify each batch query executed exactly once for the whole page
        verify(telemetryRepository, times(1)).findLatestTelemetryByMachineIds(List.of(1L, 2L));
        verify(alertRepository, times(1)).findByMachineIdInAndResolvedFalse(List.of(1L, 2L));
        verify(maintenanceRepository, times(1)).findByMachineIdIn(List.of(1L, 2L));
        verify(telemetryRepository, times(1)).findRecentTelemetriesByMachineIds(eq(List.of(1L, 2L)), any());
    }

    // =========================================================================
    // Scenario 13: Bulk Filtering by Risk Category
    // =========================================================================
    @Test
    @DisplayName("Scenario 13: Bulk assessments filter correctly by riskCategory parameter")
    void shouldFilterBulkAssessmentsByRiskCategory() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Machine> machinePage = new PageImpl<>(List.of(machine1, machine2), pageable, 2);

        LocalDateTime now = LocalDateTime.now();
        // machine1 has stable telemetry (3 readings)
        Telemetry t1_1 = createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now.minusMinutes(20), 1L);
        Telemetry t1_2 = createTelemetry(machine1, 70.1, 1.0, 45.0, 2000.0, now.minusMinutes(10), 2L);
        Telemetry t1_3 = createTelemetry(machine1, 70.0, 1.0, 45.0, 2000.0, now, 3L);

        // machine2 has critical alert -> MAINTENANCE_RECOMMENDED
        Telemetry t2 = createTelemetry(machine2, 70.0, 1.0, 45.0, 2000.0, now, 4L);
        Alert critAlert = createAlert(machine2, "OVERHEAT", "CRITICAL", "Overheating", false);

        when(machineRepository.findAll(pageable)).thenReturn(machinePage);
        when(telemetryRepository.findLatestTelemetryByMachineIds(List.of(1L, 2L))).thenReturn(List.of(t1_3, t2));
        when(alertRepository.findByMachineIdInAndResolvedFalse(List.of(1L, 2L))).thenReturn(List.of(critAlert));
        when(maintenanceRepository.findByMachineIdIn(List.of(1L, 2L))).thenReturn(List.of());
        when(telemetryRepository.findRecentTelemetriesByMachineIds(eq(List.of(1L, 2L)), any())).thenReturn(List.of(t1_1, t1_2, t1_3, t2));

        Page<PredictiveMaintenanceResponse> filteredPage = service.getBulkAssessments(pageable, "MAINTENANCE_RECOMMENDED");

        assertNotNull(filteredPage);
        assertEquals(1, filteredPage.getContent().size());
        assertEquals(2L, filteredPage.getContent().get(0).getMachineId());
        assertEquals("MAINTENANCE_RECOMMENDED", filteredPage.getContent().get(0).getRiskCategory());
    }
}
