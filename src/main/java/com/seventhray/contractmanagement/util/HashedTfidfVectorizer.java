package com.seventhray.contractmanagement.util;

import java.util.*;
import java.util.regex.Pattern;

public final class HashedTfidfVectorizer {

    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+");

    // Keep small and deterministic; contract/legal text has many domain-specific terms.
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "and", "or", "but",
            "is", "are", "was", "were", "be", "been", "being",
            "to", "of", "in", "on", "for", "with", "by", "as", "at", "from", "into", "about",
            "this", "that", "these", "those", "it", "its", "they", "them", "their",
            "what", "which", "who", "whom", "when", "where", "why", "how",
            "i", "we", "you", "he", "she"
    );

    private final int dimensions;

    public HashedTfidfVectorizer(int dimensions) {
        if (dimensions <= 0) throw new IllegalArgumentException("dimensions must be > 0");
        this.dimensions = dimensions;
    }

    public int dimensions() {
        return dimensions;
    }

    public float[] embed(String text, float[] idf) {
        if (text == null || text.isBlank()) return new float[0];
        if (idf == null || idf.length != dimensions) {
            throw new IllegalArgumentException("idf must have length=" + dimensions);
        }

        Map<Integer, Integer> tf = termCounts(text);
        if (tf.isEmpty()) return new float[0];

        float[] v = new float[dimensions];
        for (Map.Entry<Integer, Integer> e : tf.entrySet()) {
            int idx = e.getKey();
            int count = e.getValue();
            // Sublinear tf + idf
            float w = (float) (1.0 + Math.log(count));
            v[idx] = w * idf[idx];
        }

        l2NormalizeInPlace(v);
        return v;
    }

    public float[] embedTf(String text) {
        if (text == null || text.isBlank()) return new float[0];
        Map<Integer, Integer> tf = termCounts(text);
        if (tf.isEmpty()) return new float[0];

        float[] v = new float[dimensions];
        for (Map.Entry<Integer, Integer> e : tf.entrySet()) {
            int idx = e.getKey();
            int count = e.getValue();
            v[idx] = (float) (1.0 + Math.log(count));
        }
        l2NormalizeInPlace(v);
        return v;
    }

    public float[] computeIdf(List<String> documents) {
        if (documents == null || documents.isEmpty()) return ones();

        int n = documents.size();
        int[] df = new int[dimensions];
        boolean[] seen = new boolean[dimensions];

        for (String doc : documents) {
            Arrays.fill(seen, false);
            for (int idx : uniqueTermIndexes(doc)) {
                if (!seen[idx]) {
                    df[idx]++;
                    seen[idx] = true;
                }
            }
        }

        float[] idf = new float[dimensions];
        for (int i = 0; i < dimensions; i++) {
            // Smooth idf: log((N+1)/(df+1)) + 1
            idf[i] = (float) (Math.log((n + 1.0) / (df[i] + 1.0)) + 1.0);
        }
        return idf;
    }

    private float[] ones() {
        float[] out = new float[dimensions];
        Arrays.fill(out, 1f);
        return out;
    }

    private Set<Integer> uniqueTermIndexes(String text) {
        Map<Integer, Integer> tf = termCounts(text);
        return tf.keySet();
    }

    private Map<Integer, Integer> termCounts(String input) {
        String lower = input.toLowerCase(Locale.ROOT);
        String normalized = NON_WORD.matcher(lower).replaceAll(" ").trim();
        if (normalized.isEmpty()) return Map.of();

        String[] parts = normalized.split("\\s+");
        HashMap<Integer, Integer> counts = new HashMap<>();
        for (String p : parts) {
            if (p.length() < 3) continue;
            if (STOP_WORDS.contains(p)) continue;
            int idx = stableHashIndex(p, dimensions);
            counts.merge(idx, 1, Integer::sum);
        }
        return counts;
    }

    static int stableHashIndex(String token, int dims) {
        int h = token.hashCode();
        // Mix bits (xorshift-ish) to spread Java hash patterns.
        h ^= (h >>> 16);
        h *= 0x7feb352d;
        h ^= (h >>> 15);
        h *= 0x846ca68b;
        h ^= (h >>> 16);
        return Math.floorMod(h, dims);
    }

    static void l2NormalizeInPlace(float[] v) {
        double sum = 0;
        for (float x : v) sum += (double) x * x;
        if (sum <= 0) return;
        float inv = (float) (1.0 / Math.sqrt(sum));
        for (int i = 0; i < v.length; i++) v[i] *= inv;
    }
}
