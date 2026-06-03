package com.seventhray.contractmanagement.service;

import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractStatus;
import com.seventhray.contractmanagement.model.WorkflowHistory;
import com.seventhray.contractmanagement.repository.ContractChunkRepository;
import com.seventhray.contractmanagement.repository.ContractRepository;
import com.seventhray.contractmanagement.repository.WorkflowHistoryRepository;
import com.seventhray.contractmanagement.util.DocumentTextExtractor;
import com.seventhray.contractmanagement.util.FileType;
import com.seventhray.contractmanagement.util.FileTypeDetector;
import com.seventhray.contractmanagement.util.LocalFileStorage;
import com.seventhray.contractmanagement.util.StoredFile;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class ContractService {

    private static final Logger log = LoggerFactory.getLogger(ContractService.class);

    private final ContractRepository contractRepository;
    private final ContractChunkRepository contractChunkRepository;
    private final LocalFileStorage localFileStorage;
    private final FileTypeDetector fileTypeDetector;
    private final DocumentTextExtractor documentTextExtractor;
    private final ContractChunkIndexService contractChunkIndexService;
    private final ContractQaService contractQaService;
    private final WorkflowHistoryRepository workflowHistoryRepository;

    public ContractService(
            ContractRepository contractRepository,
            ContractChunkRepository contractChunkRepository,
            LocalFileStorage localFileStorage,
            FileTypeDetector fileTypeDetector,
            DocumentTextExtractor documentTextExtractor,
            ContractChunkIndexService contractChunkIndexService,
            ContractQaService contractQaService,
            WorkflowHistoryRepository workflowHistoryRepository
    ) {
        this.contractRepository = contractRepository;
        this.contractChunkRepository = contractChunkRepository;
        this.localFileStorage = localFileStorage;
        this.fileTypeDetector = fileTypeDetector;
        this.documentTextExtractor = documentTextExtractor;
        this.contractChunkIndexService = contractChunkIndexService;
        this.contractQaService = contractQaService;
        this.workflowHistoryRepository = workflowHistoryRepository;
    }

    public Contract saveContract(Contract contract) {
        if (contract.getStatus() == null) {
            contract.setStatus(ContractStatus.DRAFT);
        }
        if (contract.getUploadedAt() == null) {
            contract.setUploadedAt(Instant.now());
        }
        return contractRepository.save(contract);
    }

    public Contract getContractById(UUID id) {
        return contractRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contract not found: " + id));
    }

    @Transactional
    public Contract updateContractStatus(UUID id, ContractStatus newStatus) {
        if (newStatus == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        }

        Contract contract = getContractById(id);
        ContractStatus currentStatus = contract.getStatus() == null ? ContractStatus.DRAFT : contract.getStatus();

        if (currentStatus == newStatus) {
            return contract;
        }

        boolean allowed = switch (currentStatus) {
            case DRAFT -> newStatus == ContractStatus.REVIEW;
            case REVIEW -> newStatus == ContractStatus.APPROVED;
            case APPROVED -> false;
        };

        if (!allowed) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid status transition: " + currentStatus + " -> " + newStatus
            );
        }

        contract.setStatus(newStatus);
        Contract saved = contractRepository.save(contract);

        WorkflowHistory history = new WorkflowHistory();
        history.setContract(saved);
        history.setPreviousStatus(currentStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy("system");
        history.setChangedAt(Instant.now());
        workflowHistoryRepository.save(history);

        return saved;
    }

    public Contract uploadContract(String contractName, MultipartFile file) {
        if (contractName == null || contractName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "contractName is required");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
        }

        FileType fileType;
        try {
            fileType = fileTypeDetector.detect(file);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        StoredFile stored;
        try {
            stored = localFileStorage.store(file);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        String extractedText;
        try {
            extractedText = documentTextExtractor.extractText(stored.absolutePath(), fileType);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to extract text from document");
        }

        Contract contract = new Contract();
        contract.setContractName(contractName.trim());
        contract.setStatus(ContractStatus.DRAFT);
        contract.setOriginalFileName(stored.originalFileName());
        contract.setStoredFileName(stored.storedFileName());
        contract.setContentType(stored.contentType());
        contract.setFileSizeBytes(stored.sizeBytes());
        contract.setUploadedAt(Instant.now());
        contract.setFilePath(stored.absolutePath().toString());
        contract.setExtractedText(extractedText);

        Contract saved = contractRepository.save(contract);
        contractChunkIndexService.indexContract(saved);
        return saved;
    }

    public List<Contract> listContractsNewestFirst() {
        Sort sort = Sort.by(
                Sort.Order.desc("uploadedAt"),
                Sort.Order.desc("id")
        );
        return contractRepository.findAll(sort);
    }

    public Page<Contract> searchContracts(String search, ContractStatus status, Pageable pageable) {
        return contractRepository.findAll(contractSearchSpec(search, status), pageable);
    }

    public List<WorkflowHistory> getWorkflowHistory(UUID contractId) {
        getContractById(contractId);
        return workflowHistoryRepository.findByContractIdOrderByChangedAtDesc(contractId);
    }

    public ContractQaService.QaResult askContract(UUID id, String question) {
        Contract contract = getContractById(id);
        if (contract.getExtractedText() != null && !contract.getExtractedText().isBlank()) {
            long existingChunks = contractChunkRepository.countByContractId(id);
            if (existingChunks > 0) {
                return contractQaService.ask(id, question);
            }
            int indexed = contractChunkIndexService.indexContract(contract);
            log.info("Auto-indexed contractId={} chunks={}", id, indexed);
        }
        return contractQaService.ask(id, question);
    }

    @Transactional
    public int reindexAllContracts() {
        List<Contract> all = contractRepository.findAll();
        int reindexed = 0;
        for (Contract c : all) {
            contractChunkIndexService.indexContract(c);
            reindexed++;
        }
        return reindexed;
    }

    private static Specification<Contract> contractSearchSpec(String search, ContractStatus status) {
        return (root, query, cb) -> {
            ArrayList<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("ownerName")), like),
                        cb.like(cb.lower(root.get("contractName")), like)
                ));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
