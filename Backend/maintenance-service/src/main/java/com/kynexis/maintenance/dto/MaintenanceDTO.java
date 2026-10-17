package com.kynexis.maintenance.dto;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
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
public class MaintenanceDTO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String type;
    private String description;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate scheduledDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate completedDate;

    private String status;
    private String technician;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    private Long machineId;

    public MachineRef getMachine() {
        if (machineId == null) return null;
        return new MachineRef(machineId);
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MachineRef implements Serializable {
        private Long id;
    }
}
