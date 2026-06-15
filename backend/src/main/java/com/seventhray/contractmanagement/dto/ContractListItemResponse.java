package com.seventhray.contractmanagement.dto;

import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractStatus;

import java.time.Instant;
import java.util.UUID;

public class ContractListItemResponse {
    private UUID id;
    private String title;
    private String description;
    private String contractName;
    private ContractStatus status;
    private String ownerName;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant uploadedAt;
    private String originalFileName;
    private String contentType;
    private Long fileSizeBytes;

    public static ContractListItemResponse from(Contract contract) {
        ContractListItemResponse r = new ContractListItemResponse();
        r.setId(contract.getId());
        r.setTitle(titleOf(contract));
        r.setDescription(contract.getDescription());
        r.setContractName(contract.getContractName());
        r.setStatus(contract.getStatus());
        r.setOwnerName(contract.getOwnerName());
        r.setCreatedAt(contract.getCreatedAt());
        r.setUpdatedAt(contract.getUpdatedAt());
        r.setUploadedAt(contract.getUploadedAt());
        r.setOriginalFileName(contract.getOriginalFileName());
        r.setContentType(contract.getContentType());
        r.setFileSizeBytes(contract.getFileSizeBytes());
        return r;
    }

    private static String titleOf(Contract contract) {
        String title = contract.getTitle();
        if (title != null && !title.isBlank()) {
            return title;
        }
        return contract.getContractName();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getContractName() {
        return contractName;
    }

    public void setContractName(String contractName) {
        this.contractName = contractName;
    }

    public ContractStatus getStatus() {
        return status;
    }

    public void setStatus(ContractStatus status) {
        this.status = status;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(Instant uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }
}
