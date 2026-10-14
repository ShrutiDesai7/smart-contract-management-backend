from __future__ import annotations

import uuid
from typing import Any

from app.rag.chunker import chunk_contract_by_sections
from app.rag.vector_codec import to_bytes
from app.rag.vectorizer import HashedTfVectorizer


EMBEDDING_DIMS = 1024
vectorizer = HashedTfVectorizer(EMBEDDING_DIMS)


def index_contract(connection: Any, contract_id: uuid.UUID, extracted_text: str | None) -> int:
    connection.execute("DELETE FROM contract_chunk WHERE contract_id = %s", (contract_id,))
    chunks = chunk_contract_by_sections(extracted_text)
    saved = 0

    for chunk in chunks:
        # Prepend section title context to the text used for embedding
        embedding = vectorizer.embed_tf(chunk.search_text)
        if not embedding:
            continue

        connection.execute(
            """INSERT INTO contract_chunk 
               (contract_id, chunk_index, chunk_text, embedding, section_title, clause_number, page_number) 
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                contract_id,
                chunk.chunk_index,
                chunk.chunk_text,
                to_bytes(embedding),
                chunk.section_title,
                chunk.clause_number,
                chunk.page_number,
            ),
        )
        saved += 1

    return saved
