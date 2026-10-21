"""Speech-to-text via faster-whisper (optional dependency)."""

from typing import List

from .captions import Segment


def transcribe(path: str, model_size: str = "base", language: str = None) -> List[Segment]:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit(
            "Captions and auto-highlights need faster-whisper.\n"
            "Install it with:  pip install 'faster-whisper'"
        )
    model = WhisperModel(model_size, compute_type="int8")
    segments, _info = model.transcribe(path, language=language, vad_filter=True)
    return [Segment(s.start, s.end, s.text.strip()) for s in segments if s.text.strip()]
