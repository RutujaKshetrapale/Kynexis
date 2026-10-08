package com.example.demo.config;

import java.util.Map;

import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ActuatorInfoConfig {

    @Bean
    public InfoContributor kynexisInfoContributor() {
        return builder -> builder.withDetail("app", Map.of(
                "name", "KYNEXIS",
                "description", "Connected Industrial Intelligence",
                "version", "0.0.1-SNAPSHOT",
                "javaVersion", "21",
                "springBootVersion", "4.0.7"
        ));
    }
}
