package com.example.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import org.apache.kafka.clients.producer.RecordMetadata;
import org.apache.kafka.common.TopicPartition;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.kafka.KafkaException;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.example.demo.config.KynexisKafkaProperties;
import com.example.demo.dto.event.MachineAlertCreated;
import com.example.demo.dto.event.MachineAlertResolved;
import com.example.demo.dto.event.MachineAlertUpdated;
import com.example.demo.dto.event.MachineTelemetryRecorded;
import com.example.demo.entity.Alert;
import com.example.demo.entity.Machine;
import com.example.demo.entity.Telemetry;
import com.example.demo.logging.LoggingConstants;

@ExtendWith(MockitoExtension.class)
class KafkaEventPublisherServiceTest {

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    private KynexisKafkaProperties properties;
    private KafkaEventPublisherService publisherService;

    private void setId(Object target, Long id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set id on " + target, e);
        }
    }

    @BeforeEach
    void setUp() {
        properties = new KynexisKafkaProperties();
        properties.setEnabled(true);
        publisherService = new KafkaEventPublisherService(kafkaTemplate, properties);
        MDC.clear();
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.setActualTransactionActive(false);
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("Should construct and publish MachineTelemetryRecorded with correct topic and partition key")
    void shouldPublishTelemetryRecorded() throws Exception {
        Machine machine = new Machine();
        setId(machine, 42L);

        Telemetry telemetry = new Telemetry();
        setId(telemetry, 1001L);
        telemetry.setMachine(machine);
        telemetry.setTemperature(80.5);
        telemetry.setVibration(1.1);
        telemetry.setPressure(50.0);
        telemetry.setRpm(3100.0);
        telemetry.setTimestamp(LocalDateTime.of(2026, 10, 15, 10, 0, 0));

        MDC.put(LoggingConstants.CORRELATION_ID_KEY, "test-req-telemetry-1");

        RecordMetadata metadata = new RecordMetadata(new TopicPartition("kynexis.machine-telemetry", 0), 0, 0, 0, 0, 0);
        SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
        when(kafkaTemplate.send(eq("kynexis.machine-telemetry"), eq("42"), any()))
                .thenReturn(CompletableFuture.completedFuture(sendResult));

        CompletableFuture<SendResult<String, Object>> future = publisherService.publishTelemetryRecorded(telemetry);
        SendResult<String, Object> result = future.get();

        assertThat(result).isNotNull();

        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(eq("kynexis.machine-telemetry"), eq("42"), eventCaptor.capture());

        MachineTelemetryRecorded event = (MachineTelemetryRecorded) eventCaptor.getValue();
        assertThat(event.getMachineId()).isEqualTo(42L);
        assertThat(event.getTelemetryId()).isEqualTo(1001L);
        assertThat(event.getTemperature()).isEqualTo(80.5);
        assertThat(event.getVibration()).isEqualTo(1.1);
        assertThat(event.getPressure()).isEqualTo(50.0);
        assertThat(event.getRpm()).isEqualTo(3100.0);
        assertThat(event.getEventType()).isEqualTo("MachineTelemetryRecorded");
        assertThat(event.getSchemaVersion()).isEqualTo("1.0");
        assertThat(event.getEventId()).isNotBlank();
        assertThat(event.getCorrelationId()).isEqualTo("test-req-telemetry-1");
    }

    @Test
    @DisplayName("Should construct and publish MachineAlertCreated with correct topic and partition key")
    void shouldPublishAlertCreated() throws Exception {
        Machine machine = new Machine();
        setId(machine, 43L);

        Telemetry telemetry = new Telemetry();
        setId(telemetry, 2001L);

        Alert alert = new Alert();
        setId(alert, 501L);
        alert.setMachine(machine);
        alert.setTelemetry(telemetry);
        alert.setType("TEMPERATURE_HIGH");
        alert.setSeverity("HIGH");
        alert.setMessage("Spindle overheat detected");
        alert.setResolved(false);
        alert.setCreatedAt(LocalDateTime.of(2026, 10, 15, 10, 5, 0));

        MDC.put(LoggingConstants.CORRELATION_ID_KEY, "test-req-alert-create");

        RecordMetadata metadata = new RecordMetadata(new TopicPartition("kynexis.machine-alerts", 1), 0, 1, 0, 0, 0);
        SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
        when(kafkaTemplate.send(eq("kynexis.machine-alerts"), eq("43"), any()))
                .thenReturn(CompletableFuture.completedFuture(sendResult));

        CompletableFuture<SendResult<String, Object>> future = publisherService.publishAlertCreated(alert);
        SendResult<String, Object> result = future.get();

        assertThat(result).isNotNull();

        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(eq("kynexis.machine-alerts"), eq("43"), eventCaptor.capture());

        MachineAlertCreated event = (MachineAlertCreated) eventCaptor.getValue();
        assertThat(event.getMachineId()).isEqualTo(43L);
        assertThat(event.getAlertId()).isEqualTo(501L);
        assertThat(event.getTelemetryId()).isEqualTo(2001L);
        assertThat(event.getAlertType()).isEqualTo("TEMPERATURE_HIGH");
        assertThat(event.getSeverity()).isEqualTo("HIGH");
        assertThat(event.getMessage()).isEqualTo("Spindle overheat detected");
        assertThat(event.isResolved()).isFalse();
        assertThat(event.getEventType()).isEqualTo("MachineAlertCreated");
        assertThat(event.getCorrelationId()).isEqualTo("test-req-alert-create");
    }

    @Test
    @DisplayName("Should construct and publish MachineAlertUpdated with resolved=false")
    void shouldPublishAlertUpdated() throws Exception {
        Machine machine = new Machine();
        setId(machine, 44L);

        Alert alert = new Alert();
        setId(alert, 502L);
        alert.setMachine(machine);
        alert.setType("VIBRATION_HIGH");
        alert.setSeverity("CRITICAL");
        alert.setMessage("Bearing vibration exceeded critical limit");
        alert.setResolved(false);
        alert.setCreatedAt(LocalDateTime.of(2026, 10, 15, 10, 10, 0));

        RecordMetadata metadata = new RecordMetadata(new TopicPartition("kynexis.machine-alerts", 0), 0, 2, 0, 0, 0);
        SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
        when(kafkaTemplate.send(eq("kynexis.machine-alerts"), eq("44"), any()))
                .thenReturn(CompletableFuture.completedFuture(sendResult));

        CompletableFuture<SendResult<String, Object>> future = publisherService.publishAlertUpdated(alert);
        SendResult<String, Object> result = future.get();

        assertThat(result).isNotNull();

        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(eq("kynexis.machine-alerts"), eq("44"), eventCaptor.capture());

        MachineAlertUpdated event = (MachineAlertUpdated) eventCaptor.getValue();
        assertThat(event.getMachineId()).isEqualTo(44L);
        assertThat(event.getAlertId()).isEqualTo(502L);
        assertThat(event.getSeverity()).isEqualTo("CRITICAL");
        assertThat(event.isResolved()).isFalse();
        assertThat(event.getEventType()).isEqualTo("MachineAlertUpdated");
    }

    @Test
    @DisplayName("Should construct and publish MachineAlertResolved with resolved=true")
    void shouldPublishAlertResolved() throws Exception {
        Machine machine = new Machine();
        setId(machine, 45L);

        Alert alert = new Alert();
        setId(alert, 503L);
        alert.setMachine(machine);
        alert.setType("TEMPERATURE_HIGH");
        alert.setSeverity("HIGH");
        alert.setMessage("Spindle temperature back to normal (Auto-resolved)");
        alert.setResolved(true);
        alert.setCreatedAt(LocalDateTime.of(2026, 10, 15, 10, 15, 0));

        RecordMetadata metadata = new RecordMetadata(new TopicPartition("kynexis.machine-alerts", 0), 0, 3, 0, 0, 0);
        SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
        when(kafkaTemplate.send(eq("kynexis.machine-alerts"), eq("45"), any()))
                .thenReturn(CompletableFuture.completedFuture(sendResult));

        CompletableFuture<SendResult<String, Object>> future = publisherService.publishAlertResolved(alert);
        SendResult<String, Object> result = future.get();

        assertThat(result).isNotNull();

        ArgumentCaptor<Object> eventCaptor = ArgumentCaptor.forClass(Object.class);
        verify(kafkaTemplate).send(eq("kynexis.machine-alerts"), eq("45"), eventCaptor.capture());

        MachineAlertResolved event = (MachineAlertResolved) eventCaptor.getValue();
        assertThat(event.getMachineId()).isEqualTo(45L);
        assertThat(event.getAlertId()).isEqualTo(503L);
        assertThat(event.isResolved()).isTrue();
        assertThat(event.getEventType()).isEqualTo("MachineAlertResolved");
    }

    @Test
    @DisplayName("Should handle Kafka publishing failure asynchronously and report exception visibly")
    void shouldHandleKafkaProducerAsyncFailure() {
        Machine machine = new Machine();
        setId(machine, 46L);

        Telemetry telemetry = new Telemetry();
        setId(telemetry, 1002L);
        telemetry.setMachine(machine);

        CompletableFuture<SendResult<String, Object>> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new KafkaException("Kafka broker connection timeout"));

        when(kafkaTemplate.send(any(), any(), any())).thenReturn(failedFuture);

        CompletableFuture<SendResult<String, Object>> resultFuture = publisherService.publishTelemetryRecorded(telemetry);

        assertThat(resultFuture.isCompletedExceptionally()).isTrue();
        try {
            resultFuture.get();
        } catch (Exception ex) {
            assertThat(ex).isInstanceOf(ExecutionException.class);
            assertThat(ex.getCause()).isInstanceOf(KafkaException.class);
            assertThat(ex.getCause().getMessage()).contains("Kafka broker connection timeout");
        }
    }

    @Test
    @DisplayName("Should handle immediate Kafka send exception gracefully")
    void shouldHandleKafkaProducerImmediateException() {
        Machine machine = new Machine();
        setId(machine, 47L);

        Telemetry telemetry = new Telemetry();
        setId(telemetry, 1003L);
        telemetry.setMachine(machine);

        when(kafkaTemplate.send(any(), any(), any())).thenThrow(new KafkaException("Failed to allocate buffer"));

        CompletableFuture<SendResult<String, Object>> resultFuture = publisherService.publishTelemetryRecorded(telemetry);

        assertThat(resultFuture.isCompletedExceptionally()).isTrue();
    }

    @Test
    @DisplayName("Should safely bypass publishing when Kafka is disabled in configuration")
    void shouldBypassPublishingWhenDisabled() {
        properties.setEnabled(false);

        Machine machine = new Machine();
        setId(machine, 48L);

        Telemetry telemetry = new Telemetry();
        setId(telemetry, 1004L);
        telemetry.setMachine(machine);

        CompletableFuture<SendResult<String, Object>> future = publisherService.publishTelemetryRecorded(telemetry);

        assertThat(future).isNotNull();
        assertThat(future.isDone()).isTrue();
        verify(kafkaTemplate, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("Should safely ignore null telemetry and alert entities")
    void shouldSafelyIgnoreNullEntities() {
        publisherService.publishTelemetryRecorded(null);
        publisherService.publishAlertCreated(null);
        publisherService.publishAlertUpdated(null);
        publisherService.publishAlertResolved(null);

        verify(kafkaTemplate, never()).send(any(), any(), any());
    }

    @Test
    @DisplayName("Should publish only after commit when transaction is active and complete future")
    void shouldPublishOnlyAfterCommitWhenTransactionActive() throws Exception {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            Machine machine = new Machine();
            setId(machine, 49L);

            Telemetry telemetry = new Telemetry();
            setId(telemetry, 1005L);
            telemetry.setMachine(machine);

            RecordMetadata metadata = new RecordMetadata(new TopicPartition("kynexis.machine-telemetry", 0), 0, 0, 0, 0, 0);
            SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
            when(kafkaTemplate.send(any(), any(), any())).thenReturn(CompletableFuture.completedFuture(sendResult));

            CompletableFuture<SendResult<String, Object>> future = publisherService.publishTelemetryRecorded(telemetry);

            // Kafka send must not be called while transaction is active before commit
            verify(kafkaTemplate, never()).send(any(), any(), any());
            assertThat(future.isDone()).isFalse();

            // Simulate Spring commit lifecycle
            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCommit();
            }

            // Kafka send must now have occurred
            verify(kafkaTemplate, times(1)).send(any(), any(), any());
            assertThat(future.isDone()).isTrue();
            assertThat(future.get()).isEqualTo(sendResult);

            // Simulate subsequent afterCompletion(STATUS_COMMITTED)
            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
            }

            // Verify no second send and future still has the same result
            verify(kafkaTemplate, times(1)).send(any(), any(), any());
            assertThat(future.get()).isEqualTo(sendResult);
        } finally {
            TransactionSynchronizationManager.setActualTransactionActive(false);
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("Should complete future exceptionally and not publish when transaction rolls back")
    void shouldCompleteExceptionallyOnTransactionRollbackWithoutPublishing() {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            Machine machine = new Machine();
            setId(machine, 50L);

            Telemetry telemetry = new Telemetry();
            setId(telemetry, 1006L);
            telemetry.setMachine(machine);

            CompletableFuture<SendResult<String, Object>> future = publisherService.publishTelemetryRecorded(telemetry);

            assertThat(future.isDone()).isFalse();
            verify(kafkaTemplate, never()).send(any(), any(), any());

            // Simulate Spring rollback lifecycle (afterCommit is NOT called)
            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            }

            // Verify Kafka send was never called
            verify(kafkaTemplate, never()).send(any(), any(), any());

            // Verify future completes exceptionally without hanging indefinitely
            assertThat(future.isDone()).isTrue();
            assertThat(future.isCompletedExceptionally()).isTrue();
            assertThatThrownBy(future::get)
                    .isInstanceOf(ExecutionException.class)
                    .hasCauseInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Transaction rolled back or uncommitted");
        } finally {
            TransactionSynchronizationManager.setActualTransactionActive(false);
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("Transaction synchronization callbacks cannot complete the future or send more than once")
    void shouldNotCompleteFutureMoreThanOnceWhenCallbacksInvokedRepeatedly() {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            Machine machine = new Machine();
            setId(machine, 51L);

            Telemetry telemetry = new Telemetry();
            setId(telemetry, 1007L);
            telemetry.setMachine(machine);

            RecordMetadata metadata = new RecordMetadata(new TopicPartition("kynexis.machine-telemetry", 0), 0, 0, 0, 0, 0);
            SendResult<String, Object> sendResult = new SendResult<>(null, metadata);
            when(kafkaTemplate.send(any(), any(), any())).thenReturn(CompletableFuture.completedFuture(sendResult));

            CompletableFuture<SendResult<String, Object>> future = publisherService.publishTelemetryRecorded(telemetry);

            TransactionSynchronization sync = TransactionSynchronizationManager.getSynchronizations().get(0);

            // First commit invocation
            sync.afterCommit();
            verify(kafkaTemplate, times(1)).send(any(), any(), any());

            // Duplicate commit invocation must be ignored
            sync.afterCommit();
            verify(kafkaTemplate, times(1)).send(any(), any(), any());

            // Normal completion callback
            sync.afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
            verify(kafkaTemplate, times(1)).send(any(), any(), any());

            // Subsequent rogue rollback completion invocation must not modify already-committed future
            sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            assertThat(future.isCompletedExceptionally()).isFalse();
            assertThat(future.isDone()).isTrue();
        } finally {
            TransactionSynchronizationManager.setActualTransactionActive(false);
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
