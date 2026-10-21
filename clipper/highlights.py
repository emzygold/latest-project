"""Pick the most engaging windows of a video from its transcript.

Heuristic, no extra AI model: windows score higher with fast speech,
questions, exclamations, numbers and "hook" words. Good enough to get a
shortlist you then review.
"""

import re
from typing import List, Tuple

from .captions import Segment

HOOK_WORDS = {
    "secret", "mistake", "never", "always", "best", "worst", "why", "how",
    "biggest", "truth", "crazy", "insane", "important", "free", "money",
    "problem", "stop", "learn", "story", "wrong", "actually",
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


def find_highlights(
    segments: List[Segment],
    count: int = 5,
    min_len: float = 20.0,
    max_len: float = 60.0,
) -> List[Tuple[float, float, float]]:
    """Return up to `count` non-overlapping (start, end, score), best first."""
    if not segments:
        return []
    candidates = []
    for i, first in enumerate(segments):
        end = first.end
        text = []
        for seg in segments[i:]:
            if seg.end - first.start > max_len:
                break
            text.append(seg.text)
            end = seg.end
            length = end - first.start
            if length >= min_len:
                candidates.append((first.start, end, score_text(" ".join(text), length)))
    candidates.sort(key=lambda c: c[2], reverse=True)
    chosen = []
    for start, end, score in candidates:
        if all(end <= s or start >= e for s, e, _ in chosen):
            chosen.append((start, end, score))
        if len(chosen) == count:
            break
    return sorted(chosen, key=lambda c: c[0])
