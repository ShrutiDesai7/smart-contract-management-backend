package com.seventhray.contractmanagement.controller;

import com.seventhray.contractmanagement.dto.ContractListItemResponse;
import com.seventhray.contractmanagement.dto.ContractUploadResponse;
import com.seventhray.contractmanagement.dto.AskQuestionRequest;
import com.seventhray.contractmanagement.dto.AskQuestionResponse;
import com.seventhray.contractmanagement.dto.UpdateContractStatusRequest;
import com.seventhray.contractmanagement.dto.PagedResponse;
import com.seventhray.contractmanagement.dto.WorkflowHistoryResponse;
import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractStatus;
import com.seventhray.contractmanagement.service.ContractService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/contracts", "/contracts"})
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @PostMapping
    public Contract createContract(@RequestBody Contract contract) {
        return contractService.saveContract(contract);
    }

    @GetMapping
    public PagedResponse<ContractListItemResponse> listContracts(
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
                .map(ContractListItemResponse::from);
        return PagedResponse.from(result);
    }

    @GetMapping("/{id}")
    public Contract getContractById(@PathVariable UUID id) {
        return contractService.getContractById(id);
    }

    @GetMapping("/{id}/history")
    public List<WorkflowHistoryResponse> getWorkflowHistory(@PathVariable UUID id) {
        return contractService.getWorkflowHistory(id)
                .stream()
                .map(WorkflowHistoryResponse::from)
                .toList();
    }

    @PutMapping("/{id}/status")
    public Contract updateContractStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateContractStatusRequest request
    ) {
        return contractService.updateContractStatus(id, request.getStatus());
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ContractUploadResponse uploadContract(
            @RequestParam("contractName") String contractName,
            @RequestParam("file") MultipartFile file
    ) {
        Contract contract = contractService.uploadContract(contractName, file);
        return ContractUploadResponse.from(contract);
    }

    @PostMapping("/{id}/ask")
    public AskQuestionResponse askQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody AskQuestionRequest request
    ) {
        var result = contractService.askContract(id, request.getQuestion());
        return new AskQuestionResponse(result.answer(), result.evidence());
    }

    @PostMapping("/reindex")
    public ReindexResponse reindexAll() {
        int reindexed = contractService.reindexAllContracts();
        return new ReindexResponse(reindexed);
    }

    public record ReindexResponse(int contractsReindexed) {}
}
