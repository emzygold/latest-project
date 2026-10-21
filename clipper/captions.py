"""Build SRT captions for a clip from word/segment timestamps."""

from dataclasses import dataclass
from typing import List

from .timeparse import format_srt_time


@dataclass
class Segment:
    start: float
    end: float
    text: str


def segments_in_range(segments: List[Segment], start: float, end: float) -> List[Segment]:
    """Segments overlapping [start, end], shifted so the clip starts at 0."""
    out = []
    for seg in segments:
        if seg.end <= start or seg.start >= end:
            continue
        out.append(Segment(max(seg.start, start) - start, min(seg.end, end) - start, seg.text.strip()))
    return out


def wrap_text(text: str, max_chars: int = 28) -> str:
    """Wrap into short lines so captions fit a vertical frame."""
    lines, line = [], ""
    for word in text.split():
        if line and len(line) + 1 + len(word) > max_chars:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    if line:
        lines.append(line)
    return "\n".join(lines)


def to_srt(segments: List[Segment], max_chars: int = 28) -> str:
    blocks = []
    for i, seg in enumerate(segments, 1):
        blocks.append(
            f"{i}\n{format_srt_time(seg.start)} --> {format_srt_time(seg.end)}\n"
            f"{wrap_text(seg.text, max_chars)}\n"
        )
    return "\n".join(blocks)
