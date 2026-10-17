package com.kynexis.production;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.kynexis.production", "com.kynexis.common"})
public class ProductionEnergyServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProductionEnergyServiceApplication.class, args);
    }
}
