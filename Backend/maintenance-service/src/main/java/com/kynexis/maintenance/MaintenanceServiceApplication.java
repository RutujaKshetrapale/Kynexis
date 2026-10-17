package com.kynexis.maintenance;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.kynexis.maintenance", "com.kynexis.common"})
public class MaintenanceServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MaintenanceServiceApplication.class, args);
    }
}
