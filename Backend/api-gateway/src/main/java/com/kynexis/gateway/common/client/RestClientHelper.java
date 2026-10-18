package com.kynexis.gateway.common.client;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

public final class RestClientHelper {

    private RestClientHelper() {}

    public static RestClient createClient(String baseUrl, String internalSecret) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);

        RestClient.Builder builder = RestClient.builder().requestFactory(factory);
        if (baseUrl != null && !baseUrl.isBlank()) {
            builder.baseUrl(baseUrl);
        }
        if (internalSecret != null && !internalSecret.isBlank()) {
            builder.defaultHeader("X-Internal-Secret", internalSecret);
        }
        return builder.build();
    }
}
