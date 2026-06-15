package com.seventhray.contractmanagement.util;

import java.util.ArrayList;
import java.util.List;

public final class WordChunker {

    private WordChunker() {}

    public static List<String> chunkByWords(String text, int minWords, int maxWords, int overlapWords) {
        if (text == null) return List.of();
        String normalized = normalize(text);
        if (normalized.isEmpty()) return List.of();

        int min = Math.max(1, minWords);
        int max = Math.max(min, maxWords);
        int overlap = Math.max(0, Math.min(overlapWords, max - 1));

        List<String> words = splitWords(normalized);
        if (words.isEmpty()) return List.of();

        ArrayList<String> out = new ArrayList<>();
        int i = 0;
        while (i < words.size()) {
            int end = Math.min(words.size(), i + max);
            if (end - i < min) {
                end = words.size();
            }

            String chunk = join(words, i, end).trim();
            if (!chunk.isEmpty()) out.add(chunk);

            if (end >= words.size()) break;
            i = Math.max(i + 1, end - overlap);
        }
        return out;
    }

    private static List<String> splitWords(String s) {
        String[] parts = s.split("\\s+");
        ArrayList<String> out = new ArrayList<>(parts.length);
        for (String p : parts) {
            String t = p.trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    private static String join(List<String> words, int start, int end) {
        StringBuilder sb = new StringBuilder();
        for (int i = start; i < end; i++) {
            if (i > start) sb.append(' ');
            sb.append(words.get(i));
        }
        return sb.toString();
    }

    private static String normalize(String text) {
        String t = text.replace("\r\n", "\n").replace('\r', '\n');
        t = t.replace('\u00A0', ' '); // NBSP
        return t.trim();
    }
}

