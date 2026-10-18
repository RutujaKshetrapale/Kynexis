package com.kynexis.sensor.common.client;

import java.time.Duration;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import com.kynexis.sensor.common.logging.LoggingConstants;

public final class RestClientHelper {

    public static final Duration DEFAULT_CONNECT_TIMEOUT = Duration.ofSeconds(3);
    public static final Duration DEFAULT_READ_TIMEOUT = Duration.ofSeconds(5);

    private RestClientHelper() {}

    public static RestClient createClient(String baseUrl, String internalSecret) {
        return createClient(baseUrl, internalSecret, DEFAULT_CONNECT_TIMEOUT, DEFAULT_READ_TIMEOUT);
    }

    public static RestClient createClient(
            String baseUrl,
            String internalSecret,
            Duration connectTimeout,
            Duration readTimeout) {

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);

        RestClient.Builder builder = RestClient.builder()
                .requestFactory(requestFactory)
                .requestInitializer(request -> {
                    HttpHeaders headers = request.getHeaders();
                    if (internalSecret != null && !internalSecret.isBlank()) {
                        headers.set(LoggingConstants.INTERNAL_SECRET_HEADER, internalSecret);
                    }
                    String reqId = MDC.get(LoggingConstants.CORRELATION_ID_MDC_KEY);
                    if (reqId == null || reqId.isBlank()) {
                        reqId = UUID.randomUUID().toString();
                    }
                    headers.set(LoggingConstants.CORRELATION_ID_HEADER, reqId);
                });

        if (baseUrl != null && !baseUrl.isBlank()) {
            builder.baseUrl(baseUrl);
        }

        return builder.build();
    }
}
