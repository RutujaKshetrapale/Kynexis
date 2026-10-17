package com.kynexis.maintenance.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import com.kynexis.common.dto.MachineSummaryDTO;
import com.kynexis.common.exception.BusinessValidationException;
import com.kynexis.common.exception.ResourceNotFoundException;
import com.kynexis.common.model.HealthState;
import com.kynexis.maintenance.client.AlertServiceClient;
import com.kynexis.maintenance.client.AlertServiceClient.AlertSnapshot;
import com.kynexis.maintenance.client.MachineServiceClient;
import com.kynexis.maintenance.client.TelemetryServiceClient;
import com.kynexis.maintenance.client.TelemetryServiceClient.TelemetrySnapshot;
import com.kynexis.maintenance.config.PredictiveMaintenanceProperties;
import com.kynexis.maintenance.dto.MachineHealthResponse;
import com.kynexis.maintenance.dto.MaintenanceDTO;
import com.kynexis.maintenance.dto.MaintenanceRequest;
import com.kynexis.maintenance.dto.PredictiveMaintenanceResponse;
import com.kynexis.maintenance.entity.Maintenance;
import com.kynexis.maintenance.repository.MaintenanceRepository;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock
    private MaintenanceRepository maintenanceRepository;

    @Mock
    private MachineServiceClient machineServiceClient;

    @Mock
    private TelemetryServiceClient telemetryServiceClient;

    @Mock
    private AlertServiceClient alertServiceClient;

    private DomainValidationService domainValidationService;
    private MaintenanceService maintenanceService;
    private MachineHealthService machineHealthService;
    private PredictiveMaintenanceService predictiveMaintenanceService;
    private PredictiveMaintenanceProperties properties;

    @BeforeEach
    void setUp() {
        domainValidationService = new DomainValidationService();
        maintenanceService = new MaintenanceService(maintenanceRepository, machineServiceClient, domainValidationService);
        machineHealthService = new MachineHealthService(machineServiceClient, telemetryServiceClient, alertServiceClient);
        properties = new PredictiveMaintenanceProperties();
        predictiveMaintenanceService = new PredictiveMaintenanceService(
                machineServiceClient, telemetryServiceClient, alertServiceClient, maintenanceRepository, properties);
    }

    @Test
    @DisplayName("Create maintenance record succeeds with valid data")
    void testCreateMaintenanceSuccess() {
        when(machineServiceClient.machineExists(1L)).thenReturn(true);

        MaintenanceRequest request = MaintenanceRequest.builder()
                .machineId(1L)
                .type("PREVENTIVE")
                .description("Quarterly bearing oil replacement")
                .scheduledDate(java.time.LocalDate.now().plusDays(2))
                .status("SCHEDULED")
                .technician("John Doe")
                .build();

        Maintenance saved = Maintenance.builder()
                .id(100L)
                .machineId(1L)
                .type("PREVENTIVE")
                .description("Quarterly bearing oil replacement")
                .scheduledDate(request.getScheduledDate())
                .status("SCHEDULED")
                .technician("John Doe")
                .createdAt(LocalDateTime.now())
                .build();

        when(maintenanceRepository.save(any(Maintenance.class))).thenReturn(saved);

        MaintenanceDTO dto = maintenanceService.create(request);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(100L);
        assertThat(dto.getMachineId()).isEqualTo(1L);
        assertThat(dto.getStatus()).isEqualTo("SCHEDULED");
        verify(maintenanceRepository).save(any(Maintenance.class));
    }

    @Test
    @DisplayName("Create maintenance fails when machine does not exist")
    void testCreateMaintenanceMachineNotFound() {
        when(machineServiceClient.machineExists(999L)).thenReturn(false);

        MaintenanceRequest request = MaintenanceRequest.builder()
                .machineId(999L)
                .type("PREVENTIVE")
                .description("Oil check")
                .scheduledDate(java.time.LocalDate.now().plusDays(1))
                .status("SCHEDULED")
                .technician("Tech")
                .build();

        assertThatThrownBy(() -> maintenanceService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("MACHINE NOT FOUND");
    }

    @Test
    @DisplayName("Get all maintenance with pagination")
    void testGetAllMaintenancePaginated() {
        Maintenance m1 = Maintenance.builder().id(1L).machineId(1L).status("SCHEDULED").build();
        Maintenance m2 = Maintenance.builder().id(2L).machineId(2L).status("COMPLETED").build();

        Page<Maintenance> page = new PageImpl<>(List.of(m1, m2), PageRequest.of(0, 10), 2);
        when(maintenanceRepository.findAll(any(PageRequest.class))).thenReturn(page);

        Page<MaintenanceDTO> result = maintenanceService.getAll(PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Calculate machine health evaluates healthy state when no alerts and fresh telemetry")
    void testCalculateMachineHealthNormal() {
        MachineSummaryDTO machine = MachineSummaryDTO.builder()
                .id(1L)
                .name("CNC-01")
                .type("CNC")
                .status("RUNNING")
                .build();

        TelemetrySnapshot telemetry = TelemetrySnapshot.builder()
                .id(10L)
                .machineId(1L)
                .temperature(45.0)
                .vibration(1.2)
                .pressure(90.0)
                .rpm(1500.0)
                .timestamp(LocalDateTime.now())
                .build();

        when(machineServiceClient.getMachineSummary(1L)).thenReturn(Optional.of(machine));
        when(telemetryServiceClient.getLatestTelemetry(1L)).thenReturn(Optional.of(telemetry));
        when(alertServiceClient.getUnresolvedAlerts(1L)).thenReturn(List.of());

        MachineHealthResponse health = machineHealthService.getMachineHealth(1L);

        assertThat(health).isNotNull();
        assertThat(health.getHealthState()).isEqualTo(HealthState.HEALTHY.name());
        assertThat(health.getCriticalAlertCount()).isEqualTo(0);
        assertThat(health.getHighAlertCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("Calculate machine health evaluates critical state when critical alerts exist")
    void testCalculateMachineHealthCritical() {
        MachineSummaryDTO machine = MachineSummaryDTO.builder()
                .id(1L)
                .name("CNC-01")
                .type("CNC")
                .status("RUNNING")
                .build();

        TelemetrySnapshot telemetry = TelemetrySnapshot.builder()
                .id(10L)
                .machineId(1L)
                .temperature(95.0)
                .vibration(6.5)
                .pressure(120.0)
                .rpm(2200.0)
                .timestamp(LocalDateTime.now())
                .build();

        AlertSnapshot alert = AlertSnapshot.builder()
                .id(101L)
                .machineId(1L)
                .type("TEMPERATURE")
                .severity("CRITICAL")
                .message("Overheating emergency")
                .resolved(false)
                .build();

        when(machineServiceClient.getMachineSummary(1L)).thenReturn(Optional.of(machine));
        when(telemetryServiceClient.getLatestTelemetry(1L)).thenReturn(Optional.of(telemetry));
        when(alertServiceClient.getUnresolvedAlerts(1L)).thenReturn(List.of(alert));

        MachineHealthResponse health = machineHealthService.getMachineHealth(1L);

        assertThat(health).isNotNull();
        assertThat(health.getHealthState()).isEqualTo(HealthState.CRITICAL.name());
        assertThat(health.getCriticalAlertCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Predictive maintenance assessment returns insufficient data when no telemetry")
    void testPredictiveMaintenanceNoTelemetry() {
        MachineSummaryDTO machine = MachineSummaryDTO.builder()
                .id(1L)
                .name("CNC-01")
                .type("CNC")
                .status("RUNNING")
                .build();

        when(machineServiceClient.getMachineSummary(1L)).thenReturn(Optional.of(machine));
        when(telemetryServiceClient.getRecentTelemetry(1L, properties.getTrendReadingsLimit())).thenReturn(List.of());
        when(telemetryServiceClient.getLatestTelemetry(1L)).thenReturn(Optional.empty());
        when(alertServiceClient.getUnresolvedAlerts(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse assessment = predictiveMaintenanceService.getMachineAssessment(1L);

        assertThat(assessment).isNotNull();
        assertThat(assessment.getDataSufficiency()).isEqualTo("NO_DATA");
        assertThat(assessment.getRiskCategory()).isEqualTo("INSUFFICIENT_DATA");
    }

    @Test
    @DisplayName("Predictive maintenance detects sustained thermal rise and assigns recommended maintenance")
    void testPredictiveMaintenanceSustainedThermalRise() {
        MachineSummaryDTO machine = MachineSummaryDTO.builder()
                .id(1L)
                .name("CNC-01")
                .type("CNC")
                .status("RUNNING")
                .build();

        LocalDateTime now = LocalDateTime.now();
        List<TelemetrySnapshot> readings = List.of(
                TelemetrySnapshot.builder().id(1L).temperature(50.0).vibration(1.0).pressure(90.0).rpm(1500.0).timestamp(now.minusMinutes(30)).build(),
                TelemetrySnapshot.builder().id(2L).temperature(55.0).vibration(1.0).pressure(90.0).rpm(1500.0).timestamp(now.minusMinutes(20)).build(),
                TelemetrySnapshot.builder().id(3L).temperature(62.0).vibration(1.0).pressure(90.0).rpm(1500.0).timestamp(now.minusMinutes(10)).build()
        );

        when(machineServiceClient.getMachineSummary(1L)).thenReturn(Optional.of(machine));
        when(telemetryServiceClient.getRecentTelemetry(1L, properties.getTrendReadingsLimit())).thenReturn(readings);
        when(telemetryServiceClient.getLatestTelemetry(1L)).thenReturn(Optional.of(readings.get(2)));
        when(alertServiceClient.getUnresolvedAlerts(1L)).thenReturn(List.of());
        when(maintenanceRepository.findByMachineId(1L)).thenReturn(List.of());

        PredictiveMaintenanceResponse assessment = predictiveMaintenanceService.getMachineAssessment(1L);

        assertThat(assessment).isNotNull();
        assertThat(assessment.getDataSufficiency()).isEqualTo("SUFFICIENT");
        assertThat(assessment.getTrendFindings()).isNotEmpty();
    }
}
