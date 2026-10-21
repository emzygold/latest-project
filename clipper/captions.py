"""Captions: word timing, SRT export and animated ASS (active word highlighted)."""

import json
from dataclasses import dataclass, field, replace
from typing import List, Optional

from .timeparse import format_srt_time


@dataclass
class Word:
    start: float
    end: float
    text: str


@dataclass
class Segment:
    start: float
    end: float
    text: str
    words: List[Word] = field(default_factory=list)


@dataclass
class Style:
    font: str = "Arial"
    size: int = 84            # in pixels on a 1080x1920 canvas; scaled for other sizes
    color: str = "#FFFFFF"
    highlight: str = "#FFE600"
    outline_color: str = "#000000"
    outline: int = 6
    words_per_line: int = 3
    uppercase: bool = True
    position: str = "bottom"  # bottom | middle | top


PRESETS = {
    "pop": Style(),
    "clean": Style(size=70, highlight="#00E5FF", outline=5, words_per_line=4, uppercase=False),
    "karaoke": Style(size=90, highlight="#39FF14", words_per_line=2),
}


def load_style(preset: str = "pop", style_file: Optional[str] = None, **overrides) -> Style:
    """Preset, then optional JSON file, then explicit overrides (None values ignored)."""
    if preset not in PRESETS:
        raise ValueError(f"unknown caption style {preset!r}; choose from {', '.join(PRESETS)}")
    style = PRESETS[preset]
    if style_file:
        with open(style_file, encoding="utf-8") as f:
            data = json.load(f)
        unknown = set(data) - set(Style.__dataclass_fields__)
        if unknown:
            raise ValueError(f"unknown style keys in {style_file}: {', '.join(sorted(unknown))}")
        style = replace(style, **data)
    return replace(style, **{k: v for k, v in overrides.items() if v is not None})


def _clip_segment(seg: Segment, start: float, end: float) -> Segment:
    words = [
        Word(max(w.start, start) - start, min(w.end, end) - start, w.text)
        for w in seg.words
        if w.end > start and w.start < end
    ]
    return Segment(max(seg.start, start) - start, min(seg.end, end) - start, seg.text.strip(), words)


def segments_in_range(segments: List[Segment], start: float, end: float) -> List[Segment]:
    """Segments overlapping [start, end], shifted so the clip starts at 0."""
    return [_clip_segment(s, start, end) for s in segments if s.end > start and s.start < end]


def words_of(segments: List[Segment]) -> List[Word]:
    """Flat word list; segments without word timing get words spread by length."""
    out = []
    for seg in segments:
        if seg.words:
            out.extend(seg.words)
            continue
        tokens = seg.text.split()
        total = sum(len(t) for t in tokens) or 1
        t0 = seg.start
        for tok in tokens:
            dur = (seg.end - seg.start) * len(tok) / total
            out.append(Word(t0, t0 + dur, tok))
            t0 += dur
    return out


# --- SRT -------------------------------------------------------------------

def wrap_text(text: str, max_chars: int = 28) -> str:
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


# --- ASS (animated word-by-word) -------------------------------------------

def _ass_color(hex_color: str) -> str:
    h = hex_color.lstrip("#")
    if len(h) != 6:
        raise ValueError(f"colors must look like #RRGGBB, got {hex_color!r}")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H00{b}{g}{r}&".upper()


def _ass_time(t: float) -> str:
    cs = int(round(max(t, 0) * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02}:{s:02}.{cs:02}"


def to_ass(segments: List[Segment], style: Style, width: int = 1080, height: int = 1920) -> str:
    scale = min(width, height) / 1080
    size = max(int(style.size * scale), 12)
    outline = max(int(style.outline * scale), 1)
    alignment = {"bottom": 2, "middle": 5, "top": 8}[style.position]
    margin_v = {"top": int(0.12 * height), "middle": 0, "bottom": int(0.18 * height)}[style.position]
    base, hi = _ass_color(style.color), _ass_color(style.highlight)

    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {width}", f"PlayResY: {height}", "WrapStyle: 2", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, "
        "Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{style.font},{size},{base},{base},{_ass_color(style.outline_color)},&H00000000&,"
        f"1,0,0,0,100,100,0,0,1,{outline},0,{alignment},{int(0.06 * width)},{int(0.06 * width)},{margin_v},1",
        "", "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    words = [w for w in words_of(segments) if w.text.strip()]
    n = max(style.words_per_line, 1)
    for g in range(0, len(words), n):
        group = words[g:g + n]
        shown = [w.text.strip().upper() if style.uppercase else w.text.strip() for w in group]
        for i, w in enumerate(group):
            end = group[i + 1].start if i + 1 < len(group) else w.end
            end = max(end, w.start + 0.05)
            parts = [f"{{\\c{hi}}}{t}{{\\c{base}}}" if j == i else t for j, t in enumerate(shown)]
            lines.append(f"Dialogue: 0,{_ass_time(w.start)},{_ass_time(end)},Default,,0,0,0,,{' '.join(parts)}")
    return "\n".join(lines) + "\n"
