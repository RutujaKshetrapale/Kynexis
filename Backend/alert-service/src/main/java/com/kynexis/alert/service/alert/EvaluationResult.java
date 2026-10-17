package com.kynexis.alert.service.alert;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationResult {
    private boolean breached;
    private String severity;
    private String message;

    public static EvaluationResult ok() {
        return EvaluationResult.builder().breached(false).build();
    }

    public static EvaluationResult breached(String severity, String message) {
        return EvaluationResult.builder()
                .breached(true)
                .severity(severity)
                .message(message)
                .build();
    }
}
