from __future__ import annotations

import struct


def to_bytes(vector: list[float]) -> bytes:
    if not vector:
        return b""
    return struct.pack(f"<{len(vector)}f", *vector)


def from_bytes(data: bytes | bytearray | memoryview | None) -> list[float]:
    if not data:
        return []

    raw = bytes(data)
    if len(raw) % 4 != 0:
        raise ValueError(f"Invalid float vector bytes length: {len(raw)}")
    return list(struct.unpack(f"<{len(raw) // 4}f", raw))
