package com.kynexis.common.logging;

public final class LoggingConstants {
    private LoggingConstants() {}

    public static final String CORRELATION_ID_HEADER = "X-Request-ID";
    public static final String CORRELATION_ID_KEY = "requestId";
    public static final String CORRELATION_ID_MDC_KEY = "requestId";

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_ROLES_HEADER = "X-User-Roles";
    public static final String USER_EMAIL_HEADER = "X-User-Email";
}
