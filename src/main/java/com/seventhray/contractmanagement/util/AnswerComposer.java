package com.seventhray.contractmanagement.util;

import java.util.*;
import java.util.regex.Pattern;

public final class AnswerComposer {

    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+");

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "and", "or", "but",
            "is", "are", "was", "were", "be", "been", "being",
            "to", "of", "in", "on", "for", "with", "by", "as", "at", "from", "into", "about",
            "this", "that", "these", "those", "it", "its", "they", "them", "their",
            "what", "which", "who", "whom", "when", "where", "why", "how",
            "i", "we", "you", "he", "she"
    );

    private AnswerComposer() {}

    public static String composeAnswer(String question, List<String> evidenceChunks, int maxChars) {
        if (question == null || question.isBlank()) return "Not found in contract";
        if (evidenceChunks == null || evidenceChunks.isEmpty()) return "Not found in contract";

        Set<String> keywords = keywords(question);
        if (keywords.isEmpty()) return "Not found in contract";

        record ScoredSentence(String text, int score) {}
        List<ScoredSentence> scored = new ArrayList<>();

        for (String chunk : evidenceChunks) {
            int carryFromHeading = 0;
            for (String sentence : splitSentences(chunk)) {
                String cleaned = clean(sentence);
                if (cleaned.isEmpty()) continue;
                if (isHeadingLike(sentence, cleaned)) {
                    // If a heading matches the question, carry some relevance to the next sentence.
                    int h = overlapScore(cleaned, keywords);
                    carryFromHeading = Math.max(0, h);
                    continue;
                }

                int score = overlapScore(cleaned, keywords);
                if (score == 0 && carryFromHeading > 0) {
                    // Common in contracts: heading has keywords, value is on the next line.
                    score = Math.max(score, Math.max(1, carryFromHeading / 2));
                }
                carryFromHeading = 0;
                if (score > 0) scored.add(new ScoredSentence(cleaned, score));
            }
        }

        if (scored.isEmpty()) {
            String fallback = fallbackFromEvidence(evidenceChunks, maxChars);
            return fallback == null ? "Not found in contract" : fallback;
        }

        scored.sort((a, b) -> {
            int byScore = Integer.compare(b.score, a.score);
            if (byScore != 0) return byScore;
            return Integer.compare(a.text.length(), b.text.length());
        });

        StringBuilder out = new StringBuilder();
        LinkedHashSet<String> used = new LinkedHashSet<>();
        for (ScoredSentence s : scored) {
            if (!used.add(s.text)) continue;
            if (out.length() > 0) out.append(' ');
            out.append(s.text);
            if (out.length() >= maxChars) break;
            if (used.size() >= 3) break;
        }

        String ans = out.toString().trim();
        if (ans.isEmpty()) return "Not found in contract";
        if (ans.length() > maxChars) ans = ans.substring(0, maxChars).trim();
        return ans;
    }

    public static String composeAlways(String question, List<String> evidenceChunks, int maxChars) {
        if (evidenceChunks == null || evidenceChunks.isEmpty()) return "Not found in contract";

        String fromSentences = composeAnswer(question == null ? "" : question, evidenceChunks, maxChars);
        if (!"Not found in contract".equalsIgnoreCase(fromSentences)) {
            return fromSentences;
        }

        // Always return something useful if chunks exist.
        String fallback = fallbackFromEvidenceAllChunks(evidenceChunks, maxChars);
        if (fallback == null) {
            String raw = clean(evidenceChunks.get(0));
            if (raw.isEmpty()) return "Not found in contract";
            if (raw.length() > maxChars) raw = raw.substring(0, maxChars).trim();
            return raw;
        }
        return fallback;
    }

    private static int overlapScore(String text, Set<String> keywords) {
        Set<String> tokens = keywords(text);
        int matches = 0;
        for (String k : keywords) {
            if (tokens.contains(k)) matches++;
        }
        return matches;
    }

    private static List<String> splitSentences(String text) {
        if (text == null) return List.of();
        String normalized = text.replace("\r\n", "\n").replace('\r', '\n').trim();
        if (normalized.isEmpty()) return List.of();
        String[] parts = normalized.split("(?<=[.!?])\\s+|\\n+|\\s*[;•]+\\s*");
        ArrayList<String> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            String s = p.trim();
            if (!s.isEmpty()) out.add(s);
        }
        return out;
    }

    private static Set<String> keywords(String input) {
        String lower = input.toLowerCase(Locale.ROOT);
        String normalized = NON_WORD.matcher(lower).replaceAll(" ").trim();
        if (normalized.isEmpty()) return Set.of();
        String[] parts = normalized.split("\\s+");
        HashSet<String> out = new HashSet<>();
        for (String p : parts) {
            if (p.length() < 3) continue;
            if (STOP_WORDS.contains(p)) continue;
            out.add(p);
        }
        return out;
    }

    private static String clean(String s) {
        String t = s == null ? "" : s.trim();
        t = t.replaceAll("\\s+", " ").trim();
        t = t.replaceAll("[\\p{Punct}]+$", "").trim();
        return t;
    }

    private static String fallbackFromEvidence(List<String> evidenceChunks, int maxChars) {
        if (evidenceChunks == null) return null;
        StringBuilder sb = new StringBuilder();
        for (String chunk : evidenceChunks) {
            for (String sentence : splitSentences(chunk)) {
                String cleaned = clean(sentence);
                if (cleaned.isEmpty()) continue;
                if (isHeadingLike(sentence, cleaned)) continue;
                if (sb.length() > 0) sb.append(' ');
                sb.append(cleaned);
                if (sb.length() >= maxChars) break;
                if (sb.length() >= 40) break;
            }
            if (sb.length() > 0) break;
        }
        String out = sb.toString().trim();
        return out.isEmpty() ? null : (out.length() > maxChars ? out.substring(0, maxChars).trim() : out);
    }

    private static String fallbackFromEvidenceAllChunks(List<String> evidenceChunks, int maxChars) {
        if (evidenceChunks == null) return null;
        StringBuilder sb = new StringBuilder();
        for (String chunk : evidenceChunks) {
            String cleaned = clean(chunk);
            if (cleaned.isEmpty()) continue;
            if (sb.length() > 0) sb.append("\n\n");
            sb.append(cleaned);
            if (sb.length() >= maxChars) break;
        }
        String out = sb.toString().trim().replaceAll("\\s+\n", "\n").replaceAll("\n\\s+", "\n");
        if (out.isEmpty()) return null;
        if (out.length() > maxChars) out = out.substring(0, maxChars).trim();
        return out;
    }

    private static boolean isHeadingLike(String original, String cleaned) {
        String o = original == null ? "" : original.trim();
        String c = cleaned == null ? "" : cleaned.trim();
        if (c.isEmpty()) return true;

        // Short, all-caps lines are typically section headings.
        int wordCount = c.split("\\s+").length;
        if (wordCount <= 6 && c.length() <= 60) {
            int letters = 0;
            int upper = 0;
            for (int i = 0; i < o.length(); i++) {
                char ch = o.charAt(i);
                if (Character.isLetter(ch)) {
                    letters++;
                    if (Character.isUpperCase(ch)) upper++;
                }
            }
            if (letters > 0) {
                double ratio = upper / (double) letters;
                if (ratio >= 0.90) return true;
            }
        }

        // Very short fragments are rarely good answers.
        if (wordCount <= 2 && c.length() <= 20) return true;

        return false;
    }
}
