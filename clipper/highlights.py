"""Pick the most engaging windows of a video from its transcript.

Free, offline heuristic (no paid AI): windows score higher with fast speech,
questions, exclamations, numbers and "hook" words, and the opening line gets
extra weight because a strong hook decides whether people keep watching.
Scores are mapped to 0-100 as a "virality" estimate. It is a ranking aid,
not a prediction, so review what it picks.
"""

import math
import re
from typing import List, Tuple

from .captions import Segment

HOOK_WORDS = {
    "secret", "mistake", "never", "always", "best", "worst", "why", "how",
    "biggest", "truth", "crazy", "insane", "important", "free", "money",
    "problem", "stop", "learn", "story", "wrong", "actually", "nobody",
    "everyone", "reason", "changed", "imagine", "need", "biggest",
}


def score_text(text: str, duration: float) -> float:
    words = re.findall(r"[\w']+", text.lower())
    if not words or duration <= 0:
        return 0.0
    rate = len(words) / duration  # words per second
    hooks = sum(w in HOOK_WORDS for w in words)
    digits = sum(any(c.isdigit() for c in w) for w in words)
    return (
        min(rate, 4.0)
        + 0.5 * text.count("?")
        + 0.5 * text.count("!")
        + 0.3 * hooks
        + 0.2 * digits
    ) * (1 + min(len(words), 150) / 150)


def hook_score(first_line: str) -> float:
    """Extra weight for an opening line that is a question or uses hook words."""
    words = re.findall(r"[\w']+", first_line.lower())
    return 1.5 * ("?" in first_line) + 0.8 * sum(w in HOOK_WORDS for w in words[:12])


def to_percent(score: float) -> int:
    return int(round(100 * (1 - math.exp(-score / 9))))


def find_highlights(
    segments: List[Segment],
    count: int = 5,
    min_len: float = 30.0,
    max_len: float = 120.0,
) -> List[Tuple[float, float, int]]:
    """Return up to `count` non-overlapping (start, end, virality 0-100), in time order.

    Windows start and end on segment boundaries, so clips begin and finish
    on whole sentences instead of cutting people off mid-word.
    """
    if not segments:
        return []
    candidates = []
    for i, first in enumerate(segments):
        texts = []
        for seg in segments[i:]:
            if seg.end - first.start > max_len:
                break
            texts.append(seg.text)
            length = seg.end - first.start
            if length >= min_len:
                raw = score_text(" ".join(texts), length) + hook_score(first.text)
                candidates.append((first.start, seg.end, raw))
    candidates.sort(key=lambda c: c[2], reverse=True)
    chosen = []
    for start, end, raw in candidates:
        if all(end <= s or start >= e for s, e, _ in chosen):
            chosen.append((start, end, raw))
        if len(chosen) == count:
            break
    return [(s, e, to_percent(r)) for s, e, r in sorted(chosen)]
