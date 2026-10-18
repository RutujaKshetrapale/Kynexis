package com.kynexis.gateway.common.logging;

public final class LoggingConstants {
    private LoggingConstants() {}

    public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    public static final String CORRELATION_ID_MDC_KEY = "correlationId";
    public static final String CORRELATION_ID_KEY = "correlationId";
    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_ROLES_HEADER = "X-User-Roles";
    public static final String USER_EMAIL_HEADER = "X-User-Email";
    public static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";
}
