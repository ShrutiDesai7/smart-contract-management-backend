package com.seventhray.contractmanagement.dto;

import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractStatus;

import java.time.Instant;
import java.util.UUID;

public record AssessmentContractListItemResponse(
        UUID id,
        String title,
        String description,
        ContractStatus status,
        String ownerName,
        Instant createdAt,
        Instant updatedAt
) {
    public static AssessmentContractListItemResponse from(Contract contract) {
        return new AssessmentContractListItemResponse(
                contract.getId(),
                titleOf(contract),
                contract.getDescription(),
                contract.getStatus(),
                contract.getOwnerName(),
                contract.getCreatedAt(),
                contract.getUpdatedAt()
        );
    }

    private static String titleOf(Contract contract) {
        String title = contract.getTitle();
        if (title != null && !title.isBlank()) {
            return title;
        }
        return contract.getContractName();
    }
}
