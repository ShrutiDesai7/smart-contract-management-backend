package com.seventhray.contractmanagement.util;

import com.seventhray.contractmanagement.service.OpenAiEmbeddingsService;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SemanticSnippetRetriever {

    private final OpenAiEmbeddingsService embeddingsService;
    private final Map<String, List<float[]>> chunkEmbeddingsCache = new ConcurrentHashMap<>();

    public SemanticSnippetRetriever(OpenAiEmbeddingsService embeddingsService) {
        this.embeddingsService = embeddingsService;
    }

    public List<String> topSnippets(String extractedText, String question, int maxSnippets) {
        if (extractedText == null || extractedText.isBlank()) return List.of();
        if (question == null || question.isBlank()) return List.of();
        if (maxSnippets <= 0) return List.of();

        List<String> chunks = chunk(extractedText, 900, 120);
        if (chunks.isEmpty()) return List.of();

        // Keep some sanity bounds so we don't explode embedding calls on huge docs.
        int maxChunks = Math.min(chunks.size(), 60);
        chunks = chunks.subList(0, maxChunks);
        final List<String> chunksFinal = List.copyOf(chunks);

        float[] q = embeddingsService.embedOne(question.trim());
        if (q.length == 0) return List.of();

        String cacheKey = sha256("v1|" + maxChunks + "|" + String.join("\n", chunksFinal));
        List<float[]> chunkVectors = chunkEmbeddingsCache.computeIfAbsent(cacheKey, k -> embeddingsService.embedAll(chunksFinal));
        if (chunkVectors.isEmpty()) return List.of();

        record Scored(String text, double score) {}
        List<Scored> scored = new ArrayList<>();
        for (int i = 0; i < chunksFinal.size(); i++) {
            if (i >= chunkVectors.size()) break;
            double sim = cosine(q, chunkVectors.get(i));
            scored.add(new Scored(limit(chunksFinal.get(i), 320), sim));
        }

        scored.sort(Comparator.comparingDouble(Scored::score).reversed());
        LinkedHashSet<String> out = new LinkedHashSet<>();
        for (Scored s : scored) {
            out.add(s.text);
            if (out.size() >= maxSnippets) break;
        }
        return List.copyOf(out);
    }

    private static double cosine(float[] a, float[] b) {
        int n = Math.min(a.length, b.length);
        double dot = 0;
        double na = 0;
        double nb = 0;
        for (int i = 0; i < n; i++) {
            double x = a[i];
            double y = b[i];
            dot += x * y;
            na += x * x;
            nb += y * y;
        }
        if (na == 0 || nb == 0) return 0;
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    private static List<String> chunk(String text, int targetChars, int overlapChars) {
        String normalized = text.replace("\r\n", "\n").replace("\r", "\n").trim();
        if (normalized.isEmpty()) return List.of();

        List<String> out = new ArrayList<>();
        int i = 0;
        while (i < normalized.length()) {
            int end = Math.min(normalized.length(), i + targetChars);
            // Try to break on a newline near the end for nicer chunks.
            int nl = normalized.lastIndexOf('\n', end);
            if (nl > i + (targetChars / 2)) {
                end = nl;
            }
            String chunk = normalized.substring(i, end).trim();
            if (!chunk.isEmpty()) out.add(chunk);
            if (end >= normalized.length()) break;
            i = Math.max(end - overlapChars, end);
        }
        return out;
    }

    private static String limit(String s, int max) {
        String t = s == null ? "" : s.trim().replaceAll("\\s+", " ");
        if (t.length() <= max) return t;
        return t.substring(0, max).trim();
    }

    private static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }
}
