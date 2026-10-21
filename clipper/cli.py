"""Command-line interface: `clipper cut` and `clipper auto`."""

import argparse
import os
import sys
import tempfile
from typing import List, Optional

from . import video
from .captions import Segment, segments_in_range, to_srt
from .highlights import find_highlights
from .timeparse import parse_range


def _resolve_source(source: str, outdir: str) -> str:
    if source.startswith(("http://", "https://")):
        print(f"Downloading {source} ...")
        return video.download(source, outdir)
    if not os.path.isfile(source):
        raise SystemExit(f"File not found: {source}")
    return source


def _render(src, outdir, base, index, start, end, args, segments: Optional[List[Segment]]):
    dst = os.path.join(outdir, f"{base}_clip{index:02}.mp4")
    srt_path = None
    if segments is not None:
        clip_segs = segments_in_range(segments, start, end)
        if clip_segs:
            fd, srt_path = tempfile.mkstemp(suffix=".srt")
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                f.write(to_srt(clip_segs))
    try:
        video.cut(src, dst, start, end, vertical=args.vertical, srt=srt_path)
    finally:
        if srt_path:
            os.remove(srt_path)
    print(f"  [{index}] {start:7.1f}s -> {end:7.1f}s  {dst}")


def _transcript(src, args) -> Optional[List[Segment]]:
    from .transcribe import transcribe
    print("Transcribing (first run downloads the Whisper model) ...")
    return transcribe(src, model_size=args.model, language=args.language)


def cmd_cut(args) -> None:
    video.require_ffmpeg()
    os.makedirs(args.output, exist_ok=True)
    try:
        ranges = [parse_range(r) for r in args.ranges]
    except ValueError as e:
        raise SystemExit(str(e))
    src = _resolve_source(args.source, args.output)
    total = video.duration(src)
    for s, e in ranges:
        if s >= total:
            raise SystemExit(f"Start {s}s is past the end of the video ({total:.1f}s).")
    segments = _transcript(src, args) if args.captions else None
    base = os.path.splitext(os.path.basename(src))[0]
    print(f"Cutting {len(ranges)} clip(s):")
    for i, (s, e) in enumerate(ranges, 1):
        _render(src, args.output, base, i, s, min(e, total), args, segments)


def cmd_auto(args) -> None:
    video.require_ffmpeg()
    os.makedirs(args.output, exist_ok=True)
    src = _resolve_source(args.source, args.output)
    segments = _transcript(src, args)
    picks = find_highlights(segments, count=args.count, min_len=args.min_length, max_len=args.max_length)
    if not picks:
        raise SystemExit("No suitable highlights found (is there speech in the video?).")
    base = os.path.splitext(os.path.basename(src))[0]
    print(f"Found {len(picks)} highlight(s):")
    for i, (s, e, _score) in enumerate(picks, 1):
        _render(src, args.output, base, i, s, e, args, segments if not args.no_captions else None)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="clipper", description="Cut long videos into short clips.")
    sub = p.add_subparsers(dest="command", required=True)

    def common(sp):
        sp.add_argument("source", help="video file or URL (URLs need yt-dlp)")
        sp.add_argument("-o", "--output", default="clips", help="output folder (default: clips)")
        sp.add_argument("--vertical", action="store_true", help="export 9:16 (1080x1920) for TikTok/Reels/Shorts")
        sp.add_argument("--model", default="base", help="Whisper model: tiny, base, small, medium (default: base)")
        sp.add_argument("--language", default=None, help="speech language code, e.g. en (default: auto-detect)")

    c = sub.add_parser("cut", help="cut specific time ranges")
    common(c)
    c.add_argument("ranges", nargs="+", metavar="START-END", help="e.g. 1:30-2:15 0:10-0:45")
    c.add_argument("--captions", action="store_true", help="burn in auto-generated captions")
    c.set_defaults(func=cmd_cut)

    a = sub.add_parser("auto", help="find the best moments automatically and cut them (with captions)")
    common(a)
    a.add_argument("-n", "--count", type=int, default=5, help="number of clips (default: 5)")
    a.add_argument("--min-length", type=float, default=20, help="shortest clip in seconds (default: 20)")
    a.add_argument("--max-length", type=float, default=60, help="longest clip in seconds (default: 60)")
    a.add_argument("--no-captions", action="store_true", help="don't burn in captions")
    a.set_defaults(func=cmd_auto)
    return p


def main(argv=None) -> None:
    args = build_parser().parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main(sys.argv[1:])
