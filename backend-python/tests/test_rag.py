from __future__ import annotations

import uuid

from app.rag.answer import compose_always
from app.rag.chunker import chunk_by_words
from app.rag.qa import answer_question_from_chunks
from app.rag.vector_codec import from_bytes, to_bytes
from app.rag.vectorizer import HashedTfVectorizer


def test_chunk_by_words_uses_overlap() -> None:
    text = " ".join(f"word{i}" for i in range(1, 11))

    chunks = chunk_by_words(text, min_words=1, max_words=4, overlap_words=2)

    assert chunks == [
        "word1 word2 word3 word4",
        "word3 word4 word5 word6",
        "word5 word6 word7 word8",
        "word7 word8 word9 word10",
    ]


def test_vector_codec_round_trips_little_endian_floats() -> None:
    vector = [0.25, -1.5, 3.0]

    decoded = from_bytes(to_bytes(vector))

    assert decoded == vector


def test_qa_ranks_relevant_vector_chunk_first() -> None:
    vectorizer = HashedTfVectorizer(1024)
    rows = [
        {
            "chunk_text": "Termination notice is 15 days.",
            "embedding": to_bytes(vectorizer.embed_tf("Termination notice is 15 days.")),
        },
        {
            "chunk_text": "Payment terms are Net 30 days from invoice date.",
            "embedding": to_bytes(vectorizer.embed_tf("Payment terms are Net 30 days from invoice date.")),
        },
    ]

    class FakeConnection:
        def execute(self, *_args):
            return self

        def fetchall(self):
            return rows

    response = answer_question_from_chunks(
        FakeConnection(),
        uuid.uuid4(),
        "What are the payment terms?",
    )

    assert "Net 30" in response["answer"]
    assert response["evidence"][0].startswith("Payment terms")
    assert response["generatedBy"] == "local"


def test_answer_composer_prefers_sentence_after_matching_heading() -> None:
    answer = compose_always(
        "what are payment terms",
        ["PAYMENT TERMS\nNet 30 days from invoice date.\nOther clause."],
    )

    assert "Net 30" in answer
