package com.kynexis.common.model;

/**
 * Qualitative risk categories for predictive maintenance evaluation.
 * Kept strictly qualitative to reflect heuristic and evidence-based assessment
 * without claiming unvalidated remaining-useful-life or failure probability.
 */
public enum MaintenanceRiskCategory {
    INSUFFICIENT_DATA,
    NORMAL,
    WATCH,
    MAINTENANCE_RECOMMENDED
}
