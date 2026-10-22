# Clipper

A free, local, OpusClip-style tool. It turns long videos (podcasts, streams, YouTube)
into short vertical clips with animated captions. There are no subscriptions, no
watermarks and no upload limits, and nothing leaves your computer.

| OpusClip feature | Clipper |
|---|---|
| AI clip picking | `clipper auto`: Whisper transcript + highlight scoring, clips end on whole sentences |
| Virality score | 0-100 score and hook line per clip, saved to `*_report.json` |
| Clips of 2+ minutes | Default 30-120s. Raise `--max-length` to go longer |
| Animated captions | Word-by-word captions with the active word highlighted |
| Auto reframe 9:16 | `--vertical`, plus `--reframe face` to centre on the speaker |
| Caption styling | 3 presets, plus font, colors, size and position, plus a JSON file |

## Setup

1. Install [FFmpeg](https://ffmpeg.org/download.html) (`sudo apt install ffmpeg` / `brew install ffmpeg`).
2. Install Clipper:

```bash
pip install -e ".[ai,face,download]"   # everything
# or pick: [ai] Whisper captions + auto-highlights, [face] face reframing, [download] URLs
```

## Web app (localhost)

```bash
clipper serve
```

Then open **http://127.0.0.1:8000** in your browser. Drop in a video or paste a YouTube
link, choose "AI picks the best moments" or your own times, set the caption look, and
click **Make clips**. Clips appear on the page with their virality score and a download
button. Files are kept in `./clipper_web`. Use `clipper serve --port 8001` if port 8000 is busy.

## Command line

```bash
# find the best moments automatically (5 clips, 30-120s, captioned, vertical)
clipper auto talk.mp4 --vertical --reframe face

# longer clips, more of them, from a URL
clipper auto "https://youtube.com/watch?v=..." -n 8 --min-length 60 --max-length 180 --vertical

# cut your own ranges (times: 90, 1:30, 1:02:03)
clipper cut talk.mp4 1:30-3:45 10:00-10:45 --vertical --captions
```

Clips and `<video>_report.json` land in `./clips` (change with `-o`).

## Make it yours

```bash
clipper auto talk.mp4 --vertical --caption-style karaoke --highlight-color "#FF3B7F" --font Impact --caption-position middle
```

Presets: `pop` (default), `clean`, `karaoke`. For a style you reuse, put it in a JSON
file and pass `--style-file mine.json`:

```json
{"font": "Impact", "size": 96, "color": "#FFFFFF", "highlight": "#FF3B7F",
 "words_per_line": 2, "uppercase": true, "position": "bottom"}
```

Use `--model small` for more accurate captions (slower) and `--language en` to skip detection.

## How the scoring works

Whisper transcribes the video. Windows of whole sentences are then ranked by speech
pace, questions, exclamations, numbers and hook words ("why", "mistake", "secret"...),
with extra weight on the opening line. The 0-100 virality number is a ranking aid, not a
prediction, so review the clips. To tune it to your taste, edit `HOOK_WORDS` and the
weights in `clipper/highlights.py`.

## Limits

- Face reframing uses one steady crop per clip (the speaker's median position), so a
  clip with two people in different spots will favour one of them.
- Highlight picking is a heuristic. It does not understand topics the way a large AI model would.

## Tests

```bash
pip install -e ".[dev,face]" && pytest
```
