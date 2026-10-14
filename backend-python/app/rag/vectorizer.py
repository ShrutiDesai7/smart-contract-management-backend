from __future__ import annotations

import math
import re
from collections import Counter


NON_WORD = re.compile(r"[^a-z0-9]+")
STOP_WORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "by",
    "as",
    "at",
    "from",
    "into",
    "about",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "they",
    "them",
    "their",
    "what",
    "which",
    "who",
    "whom",
    "when",
    "where",
    "why",
    "how",
    "i",
    "we",
    "you",
    "he",
    "she",
    "shall",
    "will",
    "may",
    "can",
    "contract",
    "agreement",
    "herein",
    "hereof",
    "hereto",
    "thereto",
    "thereof",
    "forth",
}


def stem(word: str) -> str:
    """Lightweight rule-based English/legal stemmer."""
    w = word.lower()
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("es") and len(w) > 3 and not w.endswith("ees"):
        return w[:-2]
    if w.endswith("s") and len(w) > 3 and not w.endswith("ss"):
        return w[:-1]
    if w.endswith("ing") and len(w) > 4:
        return w[:-3]
    if w.endswith("ed") and len(w) > 3:
        return w[:-2]
    if w.endswith("tion") and len(w) > 5:
        return w[:-4]
    if w.endswith("ment") and len(w) > 5:
        return w[:-4]
    if w.endswith("ity") and len(w) > 4:
        return w[:-3]
    return w


def tokenize(text: str | None) -> list[str]:
    """Tokenize and stem text, removing stop words and non-alphanumerics."""
    if text is None or not text.strip():
        return []
    words = re.findall(r"[a-z0-9]+", text.lower())
    return [stem(w) for w in words if len(w) >= 3 and w not in STOP_WORDS]


class HashedTfVectorizer:
    def __init__(self, dimensions: int = 1024) -> None:
        if dimensions <= 0:
            raise ValueError("dimensions must be > 0")
        self.dimensions = dimensions

    def embed_tf(self, text: str | None) -> list[float]:
        counts = self._term_counts(text)
        if not counts:
            return []

        vector = [0.0] * self.dimensions
        for index, count in counts.items():
            vector[index] = 1.0 + math.log(count)

        return _l2_normalize(vector)

    def _term_counts(self, text: str | None) -> Counter[int]:
        tokens = tokenize(text)
        if not tokens:
            return Counter()

        counts: Counter[int] = Counter()
        for token in tokens:
            counts[_stable_hash_index(token, self.dimensions)] += 1
        return counts


def _stable_hash_index(token: str, dimensions: int) -> int:
    value = _java_string_hash(token)
    value = _int32(value ^ _unsigned_right_shift(value, 16))
    value = _int32(value * 0x7FEB352D)
    value = _int32(value ^ _unsigned_right_shift(value, 15))
    value = _int32(value * 0x846CA68B)
    value = _int32(value ^ _unsigned_right_shift(value, 16))
    return value % dimensions


def _java_string_hash(text: str) -> int:
    value = 0
    for char in text:
        value = _int32(31 * value + ord(char))
    return value


def _int32(value: int) -> int:
    value &= 0xFFFFFFFF
    return value - 0x100000000 if value & 0x80000000 else value


def _unsigned_right_shift(value: int, bits: int) -> int:
    return (value & 0xFFFFFFFF) >> bits


def _l2_normalize(vector: list[float]) -> list[float]:
    total = math.sqrt(sum(value * value for value in vector))
    if total <= 0:
        return vector
    return [value / total for value in vector]
