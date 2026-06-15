package com.seventhray.contractmanagement;

import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractStatus;
import com.seventhray.contractmanagement.repository.ContractChunkRepository;
import com.seventhray.contractmanagement.repository.ContractRepository;
import com.seventhray.contractmanagement.repository.WorkflowHistoryRepository;
import com.seventhray.contractmanagement.service.ContractService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class ContractServiceTests {

    @Autowired
    private ContractService contractService;

    @Autowired
    private ContractRepository contractRepository;

    @Autowired
    private WorkflowHistoryRepository workflowHistoryRepository;

    @Autowired
    private ContractChunkRepository contractChunkRepository;

    @BeforeEach
    void cleanDatabase() {
        contractChunkRepository.deleteAll();
        workflowHistoryRepository.deleteAll();
        contractRepository.deleteAll();
    }

    @Test
    void searchContracts_matchesTitleOwnerAndStatus() {
        saveContract("Vendor Agreement", "Vendor onboarding", "Priya Sharma", ContractStatus.REVIEW);
        saveContract("Support Contract", "Customer support", "Ravi Kumar", ContractStatus.DRAFT);
        saveContract("Approved License", "Software license", "Meera Iyer", ContractStatus.APPROVED);

        var ownerResult = contractService.searchContracts("priya", null, PageRequest.of(0, 10));
        var titleAndStatusResult = contractService.searchContracts("approved", ContractStatus.APPROVED, PageRequest.of(0, 10));

        assertThat(ownerResult.getContent())
                .singleElement()
                .extracting(Contract::getOwnerName)
                .isEqualTo("Priya Sharma");
        assertThat(titleAndStatusResult.getContent())
                .singleElement()
                .satisfies(contract -> {
                    assertThat(contract.getTitle()).isEqualTo("Approved License");
                    assertThat(contract.getStatus()).isEqualTo(ContractStatus.APPROVED);
                });
    }

    @Test
    void updateContractStatus_recordsWorkflowHistory() {
        Contract contract = saveContract("Master Services", "Annual services", "Nina Rao", ContractStatus.DRAFT);

        contractService.updateContractStatus(contract.getId(), ContractStatus.REVIEW);
        contractService.updateContractStatus(contract.getId(), ContractStatus.APPROVED);

        var history = contractService.getWorkflowHistory(contract.getId());

        assertThat(history).hasSize(2);
        assertThat(history.get(0).getPreviousStatus()).isEqualTo(ContractStatus.REVIEW);
        assertThat(history.get(0).getNewStatus()).isEqualTo(ContractStatus.APPROVED);
        assertThat(history.get(1).getPreviousStatus()).isEqualTo(ContractStatus.DRAFT);
        assertThat(history.get(1).getNewStatus()).isEqualTo(ContractStatus.REVIEW);
    }

    private Contract saveContract(String title, String description, String ownerName, ContractStatus status) {
        Contract contract = new Contract();
        contract.setTitle(title);
        contract.setContractName(title);
        contract.setDescription(description);
        contract.setOwnerName(ownerName);
        contract.setStatus(status);
        return contractService.saveContract(contract);
    }
}
