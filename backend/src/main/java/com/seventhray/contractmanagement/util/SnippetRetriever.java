package com.seventhray.contractmanagement.util;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Pattern;

@Component
public class SnippetRetriever {

    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+");

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "and", "or", "but",
            "is", "are", "was", "were", "be", "been", "being",
            "to", "of", "in", "on", "for", "with", "by", "as", "at", "from", "into", "about",
            "this", "that", "these", "those", "it", "its", "they", "them", "their",
            "what", "which", "who", "whom", "when", "where", "why", "how",
            "i", "we", "you", "he", "she"
    );

    public List<String> topSnippets(String extractedText, String question, int maxSnippets) {
        if (extractedText == null || extractedText.isBlank()) return List.of();
        if (question == null || question.isBlank()) return List.of();
        if (maxSnippets <= 0) return List.of();

        Set<String> keywords = extractKeywords(question);
        if (keywords.isEmpty()) return List.of();

        List<String> candidates = splitCandidates(extractedText);
        if (candidates.isEmpty()) return List.of();

        // Score and keep top N.
        record Scored(String text, int score) {}
        List<Scored> scored = new ArrayList<>();
        for (String c : candidates) {
            String cleaned = clean(c);
            if (cleaned.isEmpty()) continue;
            int score = overlapScore(cleaned, keywords);
            if (score > 0) {
                scored.add(new Scored(limit(cleaned, 320), score));
            }
        }

        scored.sort((a, b) -> {
            int byScore = Integer.compare(b.score, a.score);
            if (byScore != 0) return byScore;
            return Integer.compare(a.text.length(), b.text.length());
        });

        LinkedHashSet<String> out = new LinkedHashSet<>();
        for (Scored s : scored) {
            out.add(s.text);
            if (out.size() >= maxSnippets) break;
        }
        return List.copyOf(out);
    }

    private int overlapScore(String text, Set<String> keywords) {
        Set<String> tokens = extractKeywords(text);
        int matches = 0;
        for (String k : keywords) {
            if (tokens.contains(k)) matches++;
        }
        return matches;
    }

    private List<String> splitCandidates(String text) {
        String normalized = text.replace("\r\n", "\n").replace("\r", "\n").trim();
        if (normalized.isEmpty()) return List.of();

        // Split on sentence punctuation, newlines, bullets, semicolons.
        String[] parts = normalized.split("(?<=[.!?])\\s+|\\n+|\\s*[;•]+\\s*");
        List<String> out = new ArrayList<>();
        for (String p : parts) {
            String s = p.trim();
            if (!s.isEmpty()) out.add(s);
        }
        return out;
    }

    private Set<String> extractKeywords(String input) {
        String lower = input.toLowerCase(Locale.ROOT);
        String normalized = NON_WORD.matcher(lower).replaceAll(" ").trim();
        if (normalized.isEmpty()) return Set.of();
        String[] parts = normalized.split("\\s+");
        Set<String> out = new HashSet<>();
        for (String p : parts) {
            if (p.length() < 3) continue;
            if (STOP_WORDS.contains(p)) continue;
            out.add(p);
        }
        return out;
    }

    private String clean(String s) {
        String t = s == null ? "" : s.trim();
        t = t.replaceAll("\\s+", " ").trim();
        t = t.replaceAll("[\\p{Punct}]+$", "").trim();
        return t;
    }

    private String limit(String s, int max) {
        if (s.length() <= max) return s;
        return s.substring(0, max).trim();
    }
}

