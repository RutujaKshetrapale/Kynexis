package com.kynexis.maintenance.service;

import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.kynexis.maintenance.common.exception.BusinessValidationException;

@Service
public class DomainValidationService {

    public void validateMaintenanceStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new BusinessValidationException("Maintenance status is required");
        }

        String normalized = status.trim().toUpperCase();
        if (!normalized.equals("SCHEDULED")
                && !normalized.equals("IN_PROGRESS")
                && !normalized.equals("COMPLETED")
                && !normalized.equals("CANCELLED")) {
            throw new BusinessValidationException("Invalid maintenance status: " + status);
        }
    }

    public void validateMaintenanceDates(LocalDate scheduledDate, LocalDate completedDate) {
        if (scheduledDate == null) {
            throw new BusinessValidationException("Scheduled date is required");
        }

        if (completedDate != null && completedDate.isBefore(scheduledDate)) {
            throw new BusinessValidationException("Completed date cannot be before scheduled date");
        }
    }
}
