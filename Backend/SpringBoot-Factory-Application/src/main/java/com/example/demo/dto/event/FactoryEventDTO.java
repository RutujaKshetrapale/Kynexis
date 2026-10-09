package com.example.demo.dto.event;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FactoryEventDTO<T> {
    private String eventType;
    private LocalDateTime timestamp;
    private Long machineId;
    private String requestId;
    private T payload;
}
