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
import java.util.List;
import java.util.Map;

@Service
public class OpenAiAnswersService {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;

    public OpenAiAnswersService(
            ObjectMapper objectMapper,
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.model:gpt-4o-mini}") String model
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    public String answerFromSnippets(String question, List<String> snippets) {
        if (apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "OpenAI API key is not configured");
        }
        if (snippets == null || snippets.isEmpty()) {
            return "Answer: Not found in contract";
        }

        String prompt = buildPrompt(question, snippets);

        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "model", model,
                    "input", prompt,
                    "max_output_tokens", 120,
                    "temperature", 0
            ));

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/responses"))
                    .timeout(Duration.ofSeconds(40))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI request failed: HTTP " + resp.statusCode());
            }

            String outputText = extractOutputText(resp.body());
            if (outputText == null || outputText.isBlank()) {
                return "Answer: Not found in contract";
            }

            String normalized = normalizeAnswer(outputText);

            // If the model returned JSON (preferred), parse it.
            String fromJson = tryParseJsonAnswer(normalized);
            if (fromJson != null) {
                return fromJson;
            }

            if (!normalized.startsWith("Answer:")) {
                normalized = "Answer: " + normalized;
            }
            if (normalized.equalsIgnoreCase("Answer: not found in contract")) {
                return "Answer: Not found in contract";
            }
            return normalized;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI request failed");
        }
    }

    private String buildPrompt(String question, List<String> snippets) {
        StringBuilder sb = new StringBuilder();
        sb.append("You answer questions about contracts using ONLY the provided excerpts.\n");
        sb.append("Return STRICT JSON only (no markdown, no extra text) with this shape:\n");
        sb.append("{\"found\":true|false,\"answer\":\"Answer: ...\",\"evidence\":[\"<exact quote from excerpts>\", ...]}\n");
        sb.append("Rules:\n");
        sb.append("1) If answer is not supported by excerpts: found=false, answer=\"Answer: Not found in contract\", evidence=[]\n");
        sb.append("2) If found=true: evidence must contain 1-3 short exact quotes from the excerpts.\n");
        sb.append("3) The answer must be short (one sentence or extracted value).\n\n");
        sb.append("Question: ").append(question == null ? "" : question.trim()).append("\n\n");
        sb.append("Excerpts:\n");
        for (int i = 0; i < snippets.size(); i++) {
            sb.append("[").append(i + 1).append("] ").append(snippets.get(i)).append("\n");
        }
        return sb.toString();
    }

    private String extractOutputText(String json) throws Exception {
        JsonNode root = objectMapper.readTree(json);

        // Try common convenience fields first.
        if (root.hasNonNull("output_text")) {
            return root.get("output_text").asText();
        }

        // Fallback: scan output message content text items.
        JsonNode output = root.get("output");
        if (output != null && output.isArray()) {
            for (JsonNode item : output) {
                JsonNode content = item.get("content");
                if (content != null && content.isArray()) {
                    for (JsonNode c : content) {
                        String type = c.path("type").asText();
                        if ("output_text".equals(type) || "text".equals(type)) {
                            String text = c.path("text").asText(null);
                            if (text != null && !text.isBlank()) return text;
                        }
                    }
                }
            }
        }
        return null;
    }

    private String normalizeAnswer(String s) {
        String t = s == null ? "" : s.trim();
        t = t.replace("\r\n", "\n").replace("\r", "\n").trim();
        int nl = t.indexOf('\n');
        if (nl >= 0) {
            t = t.substring(0, nl).trim();
        }
        // Remove any leading markdown or quotes.
        t = t.replaceAll("^[\"'`]+", "").replaceAll("[\"'`]+$", "").trim();
        return t;
    }

    private String tryParseJsonAnswer(String text) {
        try {
            JsonNode node = objectMapper.readTree(text);
            boolean found = node.path("found").asBoolean(false);
            String answer = node.path("answer").asText(null);
            if (answer == null || answer.isBlank()) {
                return null;
            }
            if (!answer.startsWith("Answer:")) {
                answer = "Answer: " + answer.trim();
            }

            JsonNode evidence = node.get("evidence");
            if (!found) {
                return "Answer: Not found in contract";
            }

            // Append evidence (keeps UI simple but makes answers auditable).
            if (evidence != null && evidence.isArray() && evidence.size() > 0) {
                String quote = evidence.get(0).asText("").trim();
                if (!quote.isBlank()) {
                    quote = quote.replace("\r\n", " ").replace("\n", " ").trim();
                    answer = answer + " (Evidence: \"" + quote + "\")";
                }
            }
            return answer;
        } catch (Exception ignored) {
            return null;
        }
    }
}
