package com.seventhray.contractmanagement.service;

import com.seventhray.contractmanagement.model.ContractChunk;
import com.seventhray.contractmanagement.repository.ContractChunkRepository;
import com.seventhray.contractmanagement.util.AnswerComposer;
import com.seventhray.contractmanagement.util.HashedTfidfVectorizer;
import com.seventhray.contractmanagement.util.VectorCodec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class ContractQaService {

    private static final int EMBEDDING_DIMS = 1024;
    private static final int TOP_K = 3;

    private static final Logger log = LoggerFactory.getLogger(ContractQaService.class);

    private final ContractChunkRepository contractChunkRepository;
    private final HashedTfidfVectorizer vectorizer = new HashedTfidfVectorizer(EMBEDDING_DIMS);

    public record QaResult(String answer, List<String> evidence) {}

    public ContractQaService(ContractChunkRepository contractChunkRepository) {
        this.contractChunkRepository = contractChunkRepository;
    }

    public QaResult ask(UUID contractId, String question) {
        if (contractId == null) return new QaResult("Not found in contract", List.of());
        if (question == null || question.isBlank()) return new QaResult("Not found in contract", List.of());

        List<ContractChunk> chunks = contractChunkRepository.findByContractIdOrderByChunkIndexAsc(contractId);
        if (chunks.isEmpty()) return new QaResult("Not found in contract", List.of());
        log.debug("QA ask contractId={} chunks={}", contractId, chunks.size());

        float[] q = vectorizer.embedTf(question);

        record ScoredChunk(String text, double score) {}
        ArrayList<ScoredChunk> scored = new ArrayList<>(chunks.size());
        if (q.length > 0) {
            for (ContractChunk c : chunks) {
                float[] v = VectorCodec.fromBytes(c.getEmbedding());
                if (v.length == 0) {
                    scored.add(new ScoredChunk(c.getChunkText(), 0d));
                    continue;
                }
                double sim = dot(q, v); // vectors are L2-normalized => cosine similarity
                scored.add(new ScoredChunk(c.getChunkText(), sim));
            }
            scored.sort(Comparator.comparingDouble(ScoredChunk::score).reversed());
        } else {
            // If the question embeds to empty (all stop-words), fall back to contract order.
            for (ContractChunk c : chunks) scored.add(new ScoredChunk(c.getChunkText(), 0d));
        }

        ArrayList<String> evidence = new ArrayList<>(TOP_K);
        ArrayList<Double> topScores = new ArrayList<>(TOP_K);
        for (ScoredChunk s : scored) {
            evidence.add(s.text);
            topScores.add(s.score);
            if (evidence.size() >= TOP_K) break;
        }
        log.debug("QA topScores contractId={} scores={}", contractId, topScores);
        for (int i = 0; i < evidence.size(); i++) {
            log.debug("QA evidence[{}] contractId={} text={}", i, contractId, shorten(evidence.get(i), 220));
        }

        String answer = AnswerComposer.composeAlways(question, evidence, 650);
        return new QaResult(answer, List.copyOf(evidence));
    }

    private static double dot(float[] a, float[] b) {
        int n = Math.min(a.length, b.length);
        double sum = 0;
        for (int i = 0; i < n; i++) sum += (double) a[i] * b[i];
        return sum;
    }

    private static String shorten(String s, int max) {
        if (s == null) return "";
        String t = s.replace("\r\n", " ").replace("\n", " ").trim().replaceAll("\\s+", " ");
        if (t.length() <= max) return t;
        return t.substring(0, max).trim();
    }
}
