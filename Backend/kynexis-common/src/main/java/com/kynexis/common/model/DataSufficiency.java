package com.kynexis.common.model;

/**
 * Indicates the sufficiency, freshness, and completeness of telemetry
 * supporting a predictive maintenance assessment.
 */
public enum DataSufficiency {
    SUFFICIENT,
    INSUFFICIENT_DATA,
    STALE_DATA,
    NO_DATA
}
