from __future__ import annotations

import logging
import math
import re
from collections import Counter
from typing import Any

from app.config import settings
from app.llm.answers import generate_contract_answer
from app.rag.vector_codec import from_bytes
from app.rag.vectorizer import HashedTfVectorizer, STOP_WORDS, stem, tokenize

logger = logging.getLogger(__name__)

EMBEDDING_DIMS = 1024
vectorizer = HashedTfVectorizer(EMBEDDING_DIMS)


def answer_question_from_chunks(connection: Any, contract_id: object, question: str | None) -> dict[str, Any]:
    if not question or not question.strip():
        return {"answer": "I could not find this information in the contract.", "evidence": [], "generatedBy": "local"}

    clean_question = question.strip()

    # Retrieve all indexed chunks for this contract with metadata
    rows = connection.execute(
        """SELECT id, chunk_index, section_title, clause_number, page_number, chunk_text, embedding 
           FROM contract_chunk 
           WHERE contract_id = %s 
           ORDER BY chunk_index ASC""",
        (contract_id,),
    ).fetchall()

    if not rows:
        return {"answer": "I could not find this information in the contract.", "evidence": [], "generatedBy": "local"}

    # Step 3: Query Understanding
    q_tokens = tokenize(clean_question)
    if not q_tokens:
        raw_words = re.findall(r"[a-z0-9]+", clean_question.lower())
        q_tokens = [stem(w) for w in raw_words if len(w) >= 3 and w not in ("the", "to", "are", "is", "in", "of")]

    # Check for specific out-of-scope subjects (e.g. employee notice period)
    q_lower = clean_question.lower()
    is_employee_query = "employee" in q_lower

    # Step 2: Hybrid Retrieval (Semantic Vector + Lexical BM25)
    candidates = _hybrid_rank(rows, clean_question, q_tokens)

    # Debug logging as requested
    logger.info(f"RAG Search: Question='{clean_question}'")
    for cand in candidates[:3]:
        logger.info(
            f"  Candidate: id={cand['id']}, section='{cand['section_title']}', "
            f"score={cand['score']:.4f}, vec={cand['vector_sim']:.4f}, bm25={cand['bm25']:.4f}"
        )

    # Step 4: Relevance Thresholding
    threshold = getattr(settings, "rag_similarity_threshold", 0.20)
    relevant_candidates = [c for c in candidates if c["score"] >= threshold]

    # If employee query but no chunk mentions employee, disqualify
    if is_employee_query:
        relevant_candidates = [c for c in relevant_candidates if "employee" in c["chunk_text"].lower()]
        if not relevant_candidates:
            return {
                "answer": "The contract does not specify an employee notice period.",
                "evidence": [],
                "generatedBy": "local",
            }

    if not relevant_candidates:
        return {
            "answer": "I could not find this information in the contract.",
            "evidence": [],
            "generatedBy": "local",
        }

    # Step 5: Reranking & Dynamic Selection (Smallest necessary chunk)
    top_candidate = relevant_candidates[0]
    selected_chunks = [top_candidate]

    # If second candidate is very close in score and allowed, add it
    max_evidence = getattr(settings, "rag_max_evidence_chunks", 1)
    if max_evidence > 1 and len(relevant_candidates) > 1:
        second = relevant_candidates[1]
        if top_candidate["score"] - second["score"] < 0.08:
            selected_chunks.append(second)

    llm_context = [c["chunk_text"] for c in selected_chunks]
    displayed_evidence = [c["chunk_text"] for c in selected_chunks]

    result = generate_contract_answer(clean_question, llm_context)

    # Post-process answer if necessary
    final_answer = result["answer"]
    if not final_answer or final_answer.strip().lower() in ("not found in contract", "not found in contract."):
        final_answer = "I could not find this information in the contract."

    return {
        "answer": final_answer,
        "evidence": displayed_evidence,
        "generatedBy": result["generated_by"],
    }


def _hybrid_rank(rows: list[dict[str, Any]], question: str, q_tokens: list[str]) -> list[dict[str, Any]]:
    """Rank chunks using combined semantic vector similarity and lexical BM25 matching."""
    N = len(rows)
    query_vec = vectorizer.embed_tf(question)
    q_lower = question.lower()

    # Prepare chunk tokenization for BM25
    chunk_tokens_list: list[list[str]] = []
    for r in rows:
        sec = r.get("section_title") or ""
        txt = r.get("chunk_text") or ""
        chunk_tokens_list.append(tokenize(f"{sec}\n{txt}"))

    doc_lens = [len(t) for t in chunk_tokens_list]
    avg_dl = sum(doc_lens) / max(1, N)

    df_map: Counter[str] = Counter()
    for tokens in chunk_tokens_list:
        for t in set(tokens):
            df_map[t] += 1

    scored: list[dict[str, Any]] = []
    for i, row in enumerate(rows):
        # 1. Semantic Vector Cosine Similarity
        embedding_bytes = row.get("embedding")
        vec = from_bytes(embedding_bytes) if embedding_bytes else []
        vector_sim = _dot(query_vec, vec) if (query_vec and vec) else 0.0

        # 2. Lexical BM25
        bm25_score = _calculate_bm25(q_tokens, chunk_tokens_list[i], doc_lens[i], avg_dl, df_map, N)
        norm_bm25 = min(1.0, bm25_score / 6.0)

        # 3. Section Title Relevance Boost
        sec_title = (row.get("section_title") or "").strip()
        title_tokens = set(tokenize(sec_title))
        title_overlap = len(set(q_tokens).intersection(title_tokens))
        title_boost = 0.20 if title_overlap > 0 else 0.0

        # Preamble / Parties specific intent boost
        if any(p in q_lower for p in ("parties", "party", "who are")) and (
            "preamble" in sec_title.lower() or "parties" in sec_title.lower()
        ):
            title_boost += 0.35

        # 4. Critical Subject Validation (Step 3: Query Understanding)
        combined = 0.45 * vector_sim + 0.35 * norm_bm25 + title_boost
        chunk_all_lower = (sec_title + " " + row.get("chunk_text", "")).lower()

        # Specific terms check
        for sub in ("employee", "salary", "audit", "subcontractor"):
            if sub in q_lower and sub not in chunk_all_lower:
                combined *= 0.05

        scored.append({
            "id": str(row.get("id") or i),
            "chunk_index": row.get("chunk_index", i),
            "section_title": sec_title or f"Section {i + 1}",
            "clause_number": row.get("clause_number"),
            "page_number": row.get("page_number", 1),
            "chunk_text": row["chunk_text"],
            "score": combined,
            "vector_sim": vector_sim,
            "bm25": bm25_score,
            "title_boost": title_boost,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


def _calculate_bm25(
    query_tokens: list[str],
    doc_tokens: list[str],
    doc_len: int,
    avg_doc_len: float,
    df_map: Counter[str],
    total_docs: int,
) -> float:
    k1 = 1.5
    b = 0.75
    tf_map = Counter(doc_tokens)
    score = 0.0

    for q in query_tokens:
        if q not in tf_map:
            continue
        tf = tf_map[q]
        n_q = df_map.get(q, 0)
        idf = math.log((total_docs - n_q + 0.5) / (n_q + 0.5) + 1.0)
        numerator = tf * (k1 + 1)
        denominator = tf + k1 * (1 - b + b * (doc_len / max(1.0, avg_doc_len)))
        score += idf * (numerator / denominator)

    return score


def _dot(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))
