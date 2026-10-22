"""Command-line interface: `clipper cut` and `clipper auto`."""

import argparse
import json
import os
import sys
import tempfile
from typing import List, Optional

from . import video
from .captions import PRESETS, Segment, load_style, segments_in_range, to_ass
from .highlights import find_highlights
from .timeparse import parse_range


def _resolve_source(source: str, outdir: str, log=print) -> str:
    if source.startswith(("http://", "https://")):
        log(f"Downloading {source} ...")
        return video.download(source, outdir)
    if not os.path.isfile(source):
        raise SystemExit(f"File not found: {source}")
    return source


def _transcript(src, args, log=print) -> List[Segment]:
    from .transcribe import transcribe
    log("Transcribing (first run downloads the Whisper model) ...")
    return transcribe(src, model_size=args.model, language=args.language)


def _style(args):
    try:
        return load_style(args.caption_style, args.style_file, font=args.font, highlight=args.highlight_color,
                          color=args.caption_color, position=args.caption_position, size=args.caption_size)
    except (ValueError, OSError) as e:
        raise SystemExit(str(e))


def _render(src, outdir, base, index, start, end, args, segments: Optional[List[Segment]], style):
    dst = os.path.join(outdir, f"{base}_clip{index:02}.mp4")
    clip_segs = segments_in_range(segments, start, end) if segments is not None else []
    center = 0.5
    if args.vertical and args.reframe == "face":
        from .reframe import face_center_x
        found = face_center_x(src, start, end)
        center = 0.5 if found is None else found
    ass_path = None
    if clip_segs:
        w, h = video.output_size(*video.dimensions(src), args.vertical)
        fd, ass_path = tempfile.mkstemp(suffix=".ass")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(to_ass(clip_segs, style, w, h))
    try:
        video.cut(src, dst, start, end, vertical=args.vertical, subs=ass_path, center_x=center)
    finally:
        if ass_path:
            os.remove(ass_path)
    return dst, (clip_segs[0].text if clip_segs else "")


def cmd_cut(args, log=print) -> list:
    video.require_ffmpeg()
    os.makedirs(args.output, exist_ok=True)
    try:
        ranges = [parse_range(r) for r in args.ranges]
    except ValueError as e:
        raise SystemExit(str(e))
    style = _style(args)
    src = _resolve_source(args.source, args.output, log)
    total = video.duration(src)
    for s, _e in ranges:
        if s >= total:
            raise SystemExit(f"Start {s}s is past the end of the video ({total:.1f}s).")
    segments = _transcript(src, args, log) if args.captions else None
    base = os.path.splitext(os.path.basename(src))[0]
    log(f"Cutting {len(ranges)} clip(s):")
    clips = []
    for i, (s, e) in enumerate(ranges, 1):
        e = min(e, total)
        dst, hook = _render(src, args.output, base, i, s, e, args, segments, style)
        log(f"  [{i}] {s:7.1f}s -> {e:7.1f}s ({e - s:.0f}s)  {dst}")
        clips.append({"file": dst, "start": s, "end": e, "duration": round(e - s, 1), "virality": None, "hook": hook})
    return clips


def cmd_auto(args, log=print) -> list:
    video.require_ffmpeg()
    os.makedirs(args.output, exist_ok=True)
    if args.min_length > args.max_length:
        raise SystemExit("--min-length cannot be bigger than --max-length")
    style = _style(args)
    src = _resolve_source(args.source, args.output, log)
    segments = _transcript(src, args, log)
    picks = find_highlights(segments, count=args.count, min_len=args.min_length, max_len=args.max_length)
    if not picks:
        raise SystemExit("No suitable highlights found (is there speech, and is the video longer than --min-length?).")
    base = os.path.splitext(os.path.basename(src))[0]
    report = []
    log(f"Found {len(picks)} highlight(s):")
    for i, (s, e, score) in enumerate(picks, 1):
        dst, hook = _render(src, args.output, base, i, s, e, args, None if args.no_captions else segments, style)
        hook = hook or segments_in_range(segments, s, e)[0].text
        log(f"  [{i}] virality {score:3}  {s:7.1f}s -> {e:7.1f}s ({e - s:.0f}s)  {dst}\n       hook: {hook}")
        report.append({"file": dst, "start": s, "end": e, "duration": round(e - s, 1), "virality": score, "hook": hook})
    path = os.path.join(args.output, f"{base}_report.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    log(f"Report: {path}")
    return report


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="clipper", description="Free, local OpusClip-style video clipper.")
    sub = p.add_subparsers(dest="command", required=True)

    def common(sp):
        sp.add_argument("source", help="video file or URL (URLs need yt-dlp)")
        sp.add_argument("-o", "--output", default="clips", help="output folder (default: clips)")
        sp.add_argument("--vertical", action="store_true", help="export 9:16 (1080x1920) for TikTok/Reels/Shorts")
        sp.add_argument("--reframe", choices=["center", "face"], default="center",
                        help="vertical crop: 'center' or follow the speaker's 'face' (needs opencv)")
        sp.add_argument("--model", default="base", help="Whisper model: tiny, base, small, medium (default: base)")
        sp.add_argument("--language", default=None, help="speech language code, e.g. en (default: auto-detect)")
        g = sp.add_argument_group("caption style (make it yours)")
        g.add_argument("--caption-style", choices=sorted(PRESETS), default="pop", help="preset (default: pop)")
        g.add_argument("--style-file", help="JSON file overriding any style field (font, size, color, ...)")
        g.add_argument("--font", help="font name, e.g. Impact")
        g.add_argument("--caption-color", help="main caption color, #RRGGBB")
        g.add_argument("--highlight-color", help="active-word color, #RRGGBB")
        g.add_argument("--caption-size", type=int, help="font size (1080px-wide scale)")
        g.add_argument("--caption-position", choices=["bottom", "middle", "top"])

    c = sub.add_parser("cut", help="cut specific time ranges (any length)")
    common(c)
    c.add_argument("ranges", nargs="+", metavar="START-END", help="e.g. 1:30-3:45 10:00-10:45")
    c.add_argument("--captions", action="store_true", help="burn in animated captions (needs faster-whisper)")
    c.set_defaults(func=cmd_cut)

    a = sub.add_parser("auto", help="find the best moments automatically, cut and caption them")
    common(a)
    a.add_argument("-n", "--count", type=int, default=5, help="number of clips (default: 5)")
    a.add_argument("--min-length", type=float, default=30, help="shortest clip in seconds (default: 30)")
    a.add_argument("--max-length", type=float, default=120, help="longest clip in seconds (default: 120; raise it freely)")
    a.add_argument("--no-captions", action="store_true", help="don't burn in captions")
    a.set_defaults(func=cmd_auto)
    v = sub.add_parser("serve", help="start the local web app (open the link it prints)")
    v.add_argument("--host", default="127.0.0.1", help="address to listen on (default: 127.0.0.1, this computer only)")
    v.add_argument("--port", type=int, default=8000, help="port (default: 8000)")
    v.add_argument("--workdir", default="clipper_web", help="where uploads and clips are stored (default: clipper_web)")
    v.set_defaults(func=cmd_serve)
    return p


def cmd_serve(args) -> None:
    from .server import serve
    serve(args.host, args.port, args.workdir)


def main(argv=None) -> None:
    args = build_parser().parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main(sys.argv[1:])
