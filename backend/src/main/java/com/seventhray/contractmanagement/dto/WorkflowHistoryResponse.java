package com.seventhray.contractmanagement.dto;

import com.seventhray.contractmanagement.model.ContractStatus;
import com.seventhray.contractmanagement.model.WorkflowHistory;

import java.time.Instant;
import java.util.UUID;

public record WorkflowHistoryResponse(
        UUID id,
        UUID contractId,
        ContractStatus previousStatus,
        ContractStatus newStatus,
        String changedBy,
        Instant changedAt
) {
    public static WorkflowHistoryResponse from(WorkflowHistory history) {
        return new WorkflowHistoryResponse(
                history.getId(),
                history.getContract().getId(),
                history.getPreviousStatus(),
                history.getNewStatus(),
                history.getChangedBy(),
                history.getChangedAt()
        );
    }
}
