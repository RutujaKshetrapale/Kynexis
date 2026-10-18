package com.kynexis.machine.service;

import org.springframework.stereotype.Service;

import com.kynexis.machine.common.exception.BusinessValidationException;

@Service
public class DomainValidationService {

    public void validateMachineStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new BusinessValidationException("Machine status is required");
        }

        String normalized = status.trim().toUpperCase();
        if (!normalized.equals("RUNNING")
                && !normalized.equals("IDLE")
                && !normalized.equals("STOPPED")
                && !normalized.equals("MAINTENANCE")
                && !normalized.equals("OFFLINE")
                && !normalized.equals("ACTIVE")
                && !normalized.equals("INACTIVE")) {
            throw new BusinessValidationException("Invalid machine status: " + status);
        }
    }
}
