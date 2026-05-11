package com.seventhray.contractmanagement.service;

import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractStatus;
import com.seventhray.contractmanagement.repository.ContractRepository;
import com.seventhray.contractmanagement.util.DocumentTextExtractor;
import com.seventhray.contractmanagement.util.FileType;
import com.seventhray.contractmanagement.util.FileTypeDetector;
import com.seventhray.contractmanagement.util.LocalFileStorage;
import com.seventhray.contractmanagement.util.SemanticSnippetRetriever;
import com.seventhray.contractmanagement.util.StoredFile;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class ContractService {

    private final ContractRepository contractRepository;
    private final LocalFileStorage localFileStorage;
    private final FileTypeDetector fileTypeDetector;
    private final DocumentTextExtractor documentTextExtractor;
    private final SemanticSnippetRetriever snippetRetriever;
    private final OpenAiAnswersService openAiAnswersService;

    public ContractService(
            ContractRepository contractRepository,
            LocalFileStorage localFileStorage,
            FileTypeDetector fileTypeDetector,
            DocumentTextExtractor documentTextExtractor,
            SemanticSnippetRetriever snippetRetriever,
            OpenAiAnswersService openAiAnswersService
    ) {
        this.contractRepository = contractRepository;
        this.localFileStorage = localFileStorage;
        this.fileTypeDetector = fileTypeDetector;
        this.documentTextExtractor = documentTextExtractor;
        this.snippetRetriever = snippetRetriever;
        this.openAiAnswersService = openAiAnswersService;
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

    public Contract getContractById(Long id) {
        return contractRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contract not found: " + id));
    }

    public Contract updateContractStatus(Long id, ContractStatus newStatus) {
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
        return contractRepository.save(contract);
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

        return contractRepository.save(contract);
    }

    public List<Contract> listContractsNewestFirst() {
        Sort sort = Sort.by(
                Sort.Order.desc("uploadedAt"),
                Sort.Order.desc("id")
        );
        return contractRepository.findAll(sort);
    }

    public String findAnswerWithAi(Long id, String question) {
        Contract contract = getContractById(id);
        String extractedText = contract.getExtractedText();
        if (extractedText == null || extractedText.isBlank()) {
            return "Answer: Not found in contract";
        }

        var snippets = snippetRetriever.topSnippets(extractedText, question, 5);
        return openAiAnswersService.answerFromSnippets(question, snippets);
    }
}
