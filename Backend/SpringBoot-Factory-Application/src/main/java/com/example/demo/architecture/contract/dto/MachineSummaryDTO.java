package com.example.demo.architecture.contract.dto;

import java.io.Serializable;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight, decoupled data transfer object exposing machine summary
 * attributes across bounded contexts without leaking JPA entity references.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MachineSummaryDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String name;
    private String type;
    private String status;
    private Long plantId;
}
