package com.seventhray.contractmanagement.dto;

import com.seventhray.contractmanagement.model.ContractStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateContractStatusRequest {

    @NotNull
    private ContractStatus status;

    public ContractStatus getStatus() {
        return status;
    }

    public void setStatus(ContractStatus status) {
        this.status = status;
    }
}

