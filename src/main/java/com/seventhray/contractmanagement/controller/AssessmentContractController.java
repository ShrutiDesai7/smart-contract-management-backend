package com.seventhray.contractmanagement.controller;

import com.seventhray.contractmanagement.dto.AssessmentContractDetailResponse;
import com.seventhray.contractmanagement.dto.AssessmentContractListItemResponse;
import com.seventhray.contractmanagement.dto.PagedResponse;
import com.seventhray.contractmanagement.dto.WorkflowHistoryResponse;
import com.seventhray.contractmanagement.model.ContractStatus;
import com.seventhray.contractmanagement.service.ContractService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/contracts")
public class AssessmentContractController {

    private final ContractService contractService;

    public AssessmentContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @GetMapping
    public PagedResponse<AssessmentContractListItemResponse> listContracts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ContractStatus status
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );

        var result = contractService.searchContracts(search, status, pageable)
                .map(AssessmentContractListItemResponse::from);
        return PagedResponse.from(result);
    }

    @GetMapping("/{id}")
    public AssessmentContractDetailResponse getContract(@PathVariable UUID id) {
        return AssessmentContractDetailResponse.from(contractService.getContractById(id));
    }

    @GetMapping("/{id}/history")
    public List<WorkflowHistoryResponse> getWorkflowHistory(@PathVariable UUID id) {
        return contractService.getWorkflowHistory(id)
                .stream()
                .map(WorkflowHistoryResponse::from)
                .toList();
    }
}
