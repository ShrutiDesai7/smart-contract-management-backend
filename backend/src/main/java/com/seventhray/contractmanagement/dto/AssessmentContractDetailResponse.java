package com.seventhray.contractmanagement.dto;

import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractStatus;

import java.time.Instant;
import java.util.UUID;

public record AssessmentContractDetailResponse(
        UUID id,
        String title,
        String description,
        ContractStatus status,
        String ownerName,
        Instant createdAt,
        Instant updatedAt,
        String originalFileName,
        String contentType,
        Long fileSizeBytes,
        Instant uploadedAt
) {
    public static AssessmentContractDetailResponse from(Contract contract) {
        return new AssessmentContractDetailResponse(
                contract.getId(),
                titleOf(contract),
                contract.getDescription(),
                contract.getStatus(),
                contract.getOwnerName(),
                contract.getCreatedAt(),
                contract.getUpdatedAt(),
                contract.getOriginalFileName(),
                contract.getContentType(),
                contract.getFileSizeBytes(),
                contract.getUploadedAt()
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
