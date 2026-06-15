package com.seventhray.contractmanagement.dto;

import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractStatus;

import java.time.Instant;
import java.util.UUID;

public class ContractUploadResponse {
    private UUID id;
    private String contractName;
    private ContractStatus status;
    private String originalFileName;
    private String storedFileName;
    private String contentType;
    private Long fileSizeBytes;
    private Instant uploadedAt;

    public static ContractUploadResponse from(Contract contract) {
        ContractUploadResponse r = new ContractUploadResponse();
        r.setId(contract.getId());
        r.setContractName(contract.getContractName());
        r.setStatus(contract.getStatus());
        r.setOriginalFileName(contract.getOriginalFileName());
        r.setStoredFileName(contract.getStoredFileName());
        r.setContentType(contract.getContentType());
        r.setFileSizeBytes(contract.getFileSizeBytes());
        r.setUploadedAt(contract.getUploadedAt());
        return r;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getStoredFileName() {
        return storedFileName;
    }

    public void setStoredFileName(String storedFileName) {
        this.storedFileName = storedFileName;
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

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(Instant uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}
