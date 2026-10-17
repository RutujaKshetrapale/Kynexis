package com.kynexis.telemetry;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.kynexis.telemetry", "com.kynexis.common"})
public class TelemetryServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TelemetryServiceApplication.class, args);
    }
}
