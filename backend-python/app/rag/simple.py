def split_chunks(text: str, size: int = 1200) -> list[str]:
    return [
        text[index : index + size].strip()
        for index in range(0, len(text), size)
        if text[index : index + size].strip()
    ]
