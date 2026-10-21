# Clipper

Cut long videos (podcasts, streams, YouTube) into short, vertical, captioned clips
for TikTok, Reels and Shorts. Command-line tool, runs on your own computer.

## Setup

1. Install [FFmpeg](https://ffmpeg.org/download.html) (`sudo apt install ffmpeg` / `brew install ffmpeg`).
2. Install Clipper:

```bash
pip install -e .                 # cutting only
pip install -e ".[ai]"           # + captions and auto-highlights (Whisper)
pip install -e ".[download]"     # + download from URLs (yt-dlp)
```

## Use

Cut clips yourself (times can be `90`, `1:30`, or `1:02:03`):

```bash
clipper cut talk.mp4 1:30-2:15 10:00-10:45 --vertical
clipper cut talk.mp4 1:30-2:15 --vertical --captions     # needs the [ai] extra
```

Let it find the best moments for you (5 clips of 20-60s, vertical, captioned):

```bash
clipper auto talk.mp4 --vertical
clipper auto "https://youtube.com/watch?v=..." -n 8 --max-length 45 --vertical
```

Clips land in `./clips` (change with `-o`). Use `--model small` for better captions
(slower), `--language en` to skip language detection, `--no-captions` on `auto` to skip captions.

## How auto-highlights work

Whisper transcribes the video, then a simple scoring pass ranks windows by speech
speed, questions, exclamations, numbers and "hook" words (why, mistake, secret...).
It's a heuristic, so treat the result as a shortlist and review the clips.

## Tests

```bash
pip install -e ".[dev]" && pytest
```
