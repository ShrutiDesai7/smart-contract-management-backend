package com.seventhray.contractmanagement.controller;

import com.seventhray.contractmanagement.dto.ContractListItemResponse;
import com.seventhray.contractmanagement.dto.ContractUploadResponse;
import com.seventhray.contractmanagement.dto.AskQuestionRequest;
import com.seventhray.contractmanagement.dto.AskQuestionResponse;
import com.seventhray.contractmanagement.dto.UpdateContractStatusRequest;
import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.service.ContractService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/contracts")
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @PostMapping
    public Contract createContract(@RequestBody Contract contract) {
        return contractService.saveContract(contract);
    }

    @GetMapping("/{id}")
    public Contract getContractById(@PathVariable Long id) {
        return contractService.getContractById(id);
    }

    @GetMapping
    public List<ContractListItemResponse> listContracts() {
        return contractService.listContractsNewestFirst()
                .stream()
                .map(ContractListItemResponse::from)
                .toList();
    }

    @PutMapping("/{id}/status")
    public Contract updateContractStatus(
            @PathVariable Long id,
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
            @PathVariable Long id,
            @Valid @RequestBody AskQuestionRequest request
    ) {
        String answer = contractService.findAnswerWithAi(id, request.getQuestion());
        boolean matched = answer != null && !answer.equalsIgnoreCase("Answer: Not found in contract");
        return new AskQuestionResponse(null, answer, matched);
    }
}
