package com.seventhray.contractmanagement.service;

import com.seventhray.contractmanagement.model.Contract;
import com.seventhray.contractmanagement.model.ContractChunk;
import com.seventhray.contractmanagement.repository.ContractChunkRepository;
import com.seventhray.contractmanagement.util.HashedTfidfVectorizer;
import com.seventhray.contractmanagement.util.VectorCodec;
import com.seventhray.contractmanagement.util.WordChunker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class ContractChunkIndexService {

    // 1024 dims keeps storage reasonable: 1024 * 4 bytes ~= 4KB per chunk.
    private static final int EMBEDDING_DIMS = 1024;

    private static final Logger log = LoggerFactory.getLogger(ContractChunkIndexService.class);

    private final ContractChunkRepository contractChunkRepository;
    private final HashedTfidfVectorizer vectorizer = new HashedTfidfVectorizer(EMBEDDING_DIMS);

    public ContractChunkIndexService(ContractChunkRepository contractChunkRepository) {
        this.contractChunkRepository = contractChunkRepository;
    }

    @Transactional
    public int indexContract(Contract contract) {
        if (contract == null || contract.getId() == null) return 0;

        contractChunkRepository.deleteByContractId(contract.getId());

        String extractedText = contract.getExtractedText();
        if (extractedText == null || extractedText.isBlank()) return 0;

        // Requirement: 200–400 words, overlap 50 words.
        List<String> chunks = WordChunker.chunkByWords(extractedText, 200, 400, 50);
        if (chunks.isEmpty()) return 0;
        log.debug("Index contractId={} chunksCandidate={}", contract.getId(), chunks.size());

        List<ContractChunk> entities = new ArrayList<>(chunks.size());
        for (int i = 0; i < chunks.size(); i++) {
            String chunkText = chunks.get(i).trim();
            if (chunkText.isEmpty()) continue;
            float[] v = vectorizer.embedTf(chunkText);
            if (v.length == 0) continue;

            ContractChunk c = new ContractChunk();
            c.setContract(contract);
            c.setChunkIndex(i);
            c.setChunkText(chunkText);
            c.setEmbedding(VectorCodec.toBytes(v));
            entities.add(c);
        }

        if (entities.isEmpty()) return 0;
        contractChunkRepository.saveAll(entities);
        log.debug("Index contractId={} chunksSaved={}", contract.getId(), entities.size());
        return entities.size();
    }
}
