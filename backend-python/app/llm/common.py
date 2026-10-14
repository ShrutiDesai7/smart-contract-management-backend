from __future__ import annotations

from typing import Any


def extract_openai_output_text(body: dict[str, Any]) -> str | None:
    output_text = body.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text

    for item in body.get("output", []):
        for content in item.get("content", []):
            if isinstance(content.get("text"), str) and content["text"].strip():
                return content["text"]
    return None
