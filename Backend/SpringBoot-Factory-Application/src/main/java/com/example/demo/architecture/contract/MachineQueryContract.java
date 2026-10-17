package com.example.demo.architecture.contract;

import java.util.Optional;

import com.example.demo.architecture.contract.dto.MachineSummaryDTO;

/**
 * Service contract interface defining read-only machine queries exposed by
 * the Plant and Machine Management bounded context to external domains
 * (such as Telemetry, Alerts, Health & Predictive Maintenance).
 */
public interface MachineQueryContract {

    /**
     * Checks if a machine asset exists by its identifier.
     *
     * @param machineId the machine identifier
     * @return true if the machine exists, false otherwise
     */
    boolean existsById(Long machineId);

    /**
     * Retrieves a lightweight summary representation of a machine asset.
     *
     * @param machineId the machine identifier
     * @return Optional containing the MachineSummaryDTO if found, or empty
     */
    Optional<MachineSummaryDTO> findSummaryById(Long machineId);
}
