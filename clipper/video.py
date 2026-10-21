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


CAPTION_STYLE = (
    "FontName=Arial,FontSize=14,Bold=1,PrimaryColour=&H00FFFFFF&,"
    "OutlineColour=&H00000000&,BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=80"
)


def cut(
    src: str,
    dst: str,
    start: float,
    end: float,
    vertical: bool = False,
    srt: Optional[str] = None,
    crf: int = 20,
) -> None:
    """Cut [start, end] from src into dst, optionally 9:16 and captioned."""
    filters = []
    if vertical:
        filters.append("crop='min(iw,ih*9/16)':ih,scale=1080:1920,setsar=1")
    workdir = None
    if srt:
        # Run ffmpeg inside a temp dir so the subtitles path needs no escaping.
        workdir = tempfile.mkdtemp(prefix="clipper_")
        shutil.copy(srt, os.path.join(workdir, "subs.srt"))
        filters.append(f"subtitles=subs.srt:force_style='{CAPTION_STYLE}'")
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
