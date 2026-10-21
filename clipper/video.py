"""Thin wrappers around ffmpeg/ffprobe."""

import os
import shutil
import subprocess
import tempfile
from typing import Optional


def require_ffmpeg() -> None:
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        raise SystemExit("FFmpeg not found. Install it first (e.g. 'sudo apt install ffmpeg' or 'brew install ffmpeg').")


def duration(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise SystemExit(f"Could not read video: {path}\n{out.stderr.strip()}")
    return float(out.stdout.strip())


def dimensions(path: str) -> tuple:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
         "-of", "csv=p=0", path], capture_output=True, text=True)
    if out.returncode != 0 or "," not in out.stdout:
        raise SystemExit(f"Could not read video size: {path}")
    w, h = out.stdout.strip().split(",")[:2]
    return int(w), int(h)


def output_size(src_w: int, src_h: int, vertical: bool) -> tuple:
    return (1080, 1920) if vertical else (src_w, src_h)


def cut(
    src: str,
    dst: str,
    start: float,
    end: float,
    vertical: bool = False,
    subs: Optional[str] = None,
    center_x: float = 0.5,
    crf: int = 20,
) -> None:
    """Cut [start, end] from src into dst, optionally 9:16 (centred on center_x) with ASS captions."""
    filters = []
    if vertical:
        w, h = dimensions(src)
        crop_w = min(w, int(h * 9 / 16) // 2 * 2)
        x = max(0, min(int(center_x * w - crop_w / 2), w - crop_w))
        filters.append(f"crop={crop_w}:{h}:{x}:0,scale=1080:1920,setsar=1")
    workdir = None
    if subs:
        # Run ffmpeg inside a temp dir so the subtitle path needs no escaping.
        workdir = tempfile.mkdtemp(prefix="clipper_")
        shutil.copy(subs, os.path.join(workdir, "subs.ass"))
        filters.append("ass=subs.ass")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
           "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", os.path.abspath(src)]
    if filters:
        cmd += ["-vf", ",".join(filters)]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf),
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", os.path.abspath(dst)]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, cwd=workdir)
    finally:
        if workdir:
            shutil.rmtree(workdir, ignore_errors=True)
    if res.returncode != 0:
        raise SystemExit(f"ffmpeg failed:\n{res.stderr.strip()}")


def download(url: str, outdir: str) -> str:
    try:
        import yt_dlp
    except ImportError:
        raise SystemExit("Downloading URLs needs yt-dlp:  pip install yt-dlp")
    opts = {"outtmpl": os.path.join(outdir, "%(title).80s.%(ext)s"),
            "format": "mp4/bestvideo+bestaudio/best", "merge_output_format": "mp4", "quiet": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return ydl.prepare_filename(info)
