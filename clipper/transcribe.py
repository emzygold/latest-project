"""Speech-to-text with word timings via faster-whisper (optional dependency)."""

from typing import List

from .captions import Segment, Word


def transcribe(path: str, model_size: str = "base", language: str = None) -> List[Segment]:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit(
            "Captions and auto-highlights need faster-whisper.\n"
            "Install it with:  pip install faster-whisper"
        )
    model = WhisperModel(model_size, compute_type="int8")
    segments, _info = model.transcribe(path, language=language, vad_filter=True, word_timestamps=True)
    out = []
    for s in segments:
        text = s.text.strip()
        if text:
            words = [Word(w.start, w.end, w.word.strip()) for w in (s.words or []) if w.word.strip()]
            out.append(Segment(s.start, s.end, text, words))
    return out
