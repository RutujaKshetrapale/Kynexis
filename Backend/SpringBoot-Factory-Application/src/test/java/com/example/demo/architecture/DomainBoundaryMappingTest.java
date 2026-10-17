package com.example.demo.architecture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.example.demo.service.AlertService;
import com.example.demo.service.AuthService;
import com.example.demo.service.DashboardService;
import com.example.demo.service.EnergyService;
import com.example.demo.service.MachineHealthService;
import com.example.demo.service.MachineService;
import com.example.demo.service.MaintenanceService;
import com.example.demo.service.PlantService;
import com.example.demo.service.PredictiveMaintenanceService;
import com.example.demo.service.ProductionService;
import com.example.demo.service.SensorService;
import com.example.demo.service.TelemetryService;
import com.example.demo.service.alert.AlertEngineService;

class DomainBoundaryMappingTest {

    private void assertBoundary(Class<?> serviceClass, BoundedContext expectedContext) {
        DomainBoundary annotation = serviceClass.getAnnotation(DomainBoundary.class);
        assertNotNull(annotation, "Class " + serviceClass.getSimpleName() + " must be annotated with @DomainBoundary");
        assertEquals(expectedContext, annotation.value(),
                "Class " + serviceClass.getSimpleName() + " must be assigned to " + expectedContext);
    }

    @Test
    @DisplayName("Should verify all domain services are explicitly mapped to their Bounded Context")
    void shouldVerifyAllDomainServicesMapped() {
        assertBoundary(AuthService.class, BoundedContext.IDENTITY_AND_ACCESS);
        assertBoundary(MachineService.class, BoundedContext.PLANT_AND_MACHINE);
        assertBoundary(PlantService.class, BoundedContext.PLANT_AND_MACHINE);
        assertBoundary(SensorService.class, BoundedContext.PLANT_AND_MACHINE);
        assertBoundary(TelemetryService.class, BoundedContext.TELEMETRY);
        assertBoundary(AlertService.class, BoundedContext.ALERT_MANAGEMENT);
        assertBoundary(AlertEngineService.class, BoundedContext.ALERT_MANAGEMENT);
        assertBoundary(MachineHealthService.class, BoundedContext.HEALTH_AND_PREDICTIVE_MAINTENANCE);
        assertBoundary(PredictiveMaintenanceService.class, BoundedContext.HEALTH_AND_PREDICTIVE_MAINTENANCE);
        assertBoundary(MaintenanceService.class, BoundedContext.HEALTH_AND_PREDICTIVE_MAINTENANCE);
        assertBoundary(ProductionService.class, BoundedContext.PRODUCTION_AND_ENERGY);
        assertBoundary(EnergyService.class, BoundedContext.PRODUCTION_AND_ENERGY);
        assertBoundary(DashboardService.class, BoundedContext.DASHBOARD_AGGREGATION);
    }
}
