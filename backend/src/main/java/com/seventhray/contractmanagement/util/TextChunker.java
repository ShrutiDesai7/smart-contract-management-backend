package com.seventhray.contractmanagement.util;

import java.util.ArrayList;
import java.util.List;

public final class TextChunker {

    private TextChunker() {}

    public static List<String> chunkByChars(String text, int minChars, int maxChars, int overlapChars) {
        if (text == null) return List.of();
        String normalized = normalize(text);
        if (normalized.isEmpty()) return List.of();

        int min = Math.max(1, minChars);
        int max = Math.max(min, maxChars);
        int overlap = Math.max(0, Math.min(overlapChars, max - 1));

        List<String> out = new ArrayList<>();
        int i = 0;
        while (i < normalized.length()) {
            int hardEnd = Math.min(normalized.length(), i + max);
            int end = chooseBreak(normalized, i, hardEnd, min);
            String chunk = normalized.substring(i, end).trim();
            if (!chunk.isEmpty()) out.add(chunk);
            if (end >= normalized.length()) break;
            i = Math.max(i + 1, end - overlap);
        }
        return out;
    }

    private static int chooseBreak(String s, int start, int hardEnd, int min) {
        if (hardEnd - start <= min) return hardEnd;

        int preferredFrom = start + min;

        // Prefer breaking on paragraph boundaries.
        int dblNl = s.lastIndexOf("\n\n", hardEnd);
        if (dblNl >= preferredFrom) return dblNl;

        // Prefer breaking on newline.
        int nl = s.lastIndexOf('\n', hardEnd);
        if (nl >= preferredFrom) return nl;

        // Prefer breaking on sentence end or semicolon.
        for (int i = hardEnd - 1; i >= preferredFrom; i--) {
            char c = s.charAt(i);
            if (c == '.' || c == '!' || c == '?' || c == ';') return i + 1;
        }

        // Fallback: break at last space.
        int sp = s.lastIndexOf(' ', hardEnd);
        if (sp >= preferredFrom) return sp;

        return hardEnd;
    }

    private static String normalize(String text) {
        return text.replace("\r\n", "\n").replace('\r', '\n').trim();
    }
}

