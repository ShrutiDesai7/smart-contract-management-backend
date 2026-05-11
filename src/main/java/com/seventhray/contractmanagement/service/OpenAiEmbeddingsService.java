package com.seventhray.contractmanagement.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiEmbeddingsService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;
    private final int maxRetries;

    public OpenAiEmbeddingsService(
            ObjectMapper objectMapper,
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.embedding-model:text-embedding-3-small}") String model,
            @Value("${openai.embeddings.max-retries:3}") int maxRetries
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.maxRetries = Math.max(0, maxRetries);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    public float[] embedOne(String input) {
        if (input == null || input.isBlank()) {
            return new float[0];
        }
        List<float[]> all = embedAll(List.of(input));
        return all.isEmpty() ? new float[0] : all.get(0);
    }

    public List<float[]> embedAll(List<String> inputs) {
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "OpenAI API key is not configured");
        }
        if (inputs == null || inputs.isEmpty()) {
            return List.of();
        }

        int attempt = 0;
        while (true) {
            attempt++;
            try {
                String body = objectMapper.writeValueAsString(Map.of(
                        "model", model,
                        "input", inputs
                ));

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.openai.com/v1/embeddings"))
                        .timeout(Duration.ofSeconds(40))
                        .header("Authorization", "Bearer " + apiKey)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();

                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
                int code = resp.statusCode();
                if (code >= 200 && code < 300) {
                    return parseEmbeddings(resp.body(), inputs.size());
                }

                if (code == 429 && attempt <= maxRetries + 1) {
                    sleepBackoffMillis(retryAfterMillis(resp), attempt);
                    continue;
                }

                if (code == 401 || code == 403) {
                    throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI embeddings request unauthorized");
                }

                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI embeddings request failed: HTTP " + code);
            } catch (ResponseStatusException e) {
                throw e;
            } catch (Exception e) {
                if (attempt <= maxRetries + 1) {
                    sleepBackoffMillis(250L * attempt, attempt);
                    continue;
                }
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI embeddings request failed");
            }
        }
    }

    private List<float[]> parseEmbeddings(String json, int expected) throws Exception {
        JsonNode root = objectMapper.readTree(json);
        JsonNode data = root.get("data");
        if (data == null || !data.isArray()) {
            return List.of();
        }
        List<float[]> out = new ArrayList<>();
        for (JsonNode item : data) {
            JsonNode emb = item.get("embedding");
            if (emb == null || !emb.isArray()) continue;
            float[] v = new float[emb.size()];
            for (int i = 0; i < emb.size(); i++) {
                v[i] = (float) emb.get(i).asDouble();
            }
            out.add(v);
        }
        // If API returns fewer vectors than requested, still return what we have.
        if (out.size() > expected) {
            return out.subList(0, expected);
        }
        return out;
    }

    private long retryAfterMillis(HttpResponse<?> resp) {
        Optional<String> ra = resp.headers().firstValue("retry-after");
        if (ra.isEmpty()) return 0;
        try {
            long seconds = Long.parseLong(ra.get().trim());
            return Math.max(0, seconds) * 1000L;
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private void sleepBackoffMillis(long retryAfterMillis, int attempt) {
        long base = retryAfterMillis > 0 ? retryAfterMillis : (400L * (1L << Math.min(6, attempt - 1)));
        long jitter = (long) (Math.random() * 150L);
        long sleep = Math.min(10_000L, base + jitter);
        try {
            Thread.sleep(sleep);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
