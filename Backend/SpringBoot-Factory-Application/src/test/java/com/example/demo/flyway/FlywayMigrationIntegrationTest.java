package com.example.demo.flyway;

import static org.assertj.core.api.Assertions.assertThat;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class FlywayMigrationIntegrationTest {

    @Autowired(required = false)
    private Flyway flyway;

    @Test
    @DisplayName("Verify Flyway Bean and Migration Execution")
    void testFlywayMigrationExecution() {
        assertThat(flyway).isNotNull();

        MigrationInfo[] appliedMigrations = flyway.info().applied();
        assertThat(appliedMigrations).isNotEmpty();

        boolean hasV1 = false;

        for (MigrationInfo info : appliedMigrations) {
            if (info.getVersion() != null && "1".equals(info.getVersion().getVersion())) {
                hasV1 = true;
            }
        }

        assertThat(hasV1).isTrue();
    }

    @Test
    @DisplayName("Verify Current Flyway Schema Version")
    void testFlywaySchemaCurrentVersion() {
        assertThat(flyway).isNotNull();

        MigrationInfo current = flyway.info().current();
        assertThat(current).isNotNull();
        assertThat(current.getVersion()).isNotNull();
        assertThat(current.getVersion().getVersion()).isEqualTo("1");
    }

    @Test
    @DisplayName("Verify Full Migration Execution Including V2 Seed Data")
    void testFullFlywayMigrationThroughV2() {
        Flyway isolatedFlyway = Flyway.configure()
                .dataSource("jdbc:h2:mem:v2testdb;DB_CLOSE_DELAY=-1;MODE=MySQL", "sa", "")
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .load();

        isolatedFlyway.migrate();

        MigrationInfo current = isolatedFlyway.info().current();
        assertThat(current).isNotNull();
        assertThat(current.getVersion()).isNotNull();
        assertThat(current.getVersion().getVersion()).isEqualTo("2");
    }
}
