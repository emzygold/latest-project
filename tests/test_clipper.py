import os
import shutil
import subprocess

import pytest

from clipper import video
from clipper.captions import Segment, Style, Word, load_style, segments_in_range, to_ass, to_srt, wrap_text
from clipper.cli import main
from clipper.highlights import find_highlights
from clipper.timeparse import format_srt_time, parse_range, parse_time


def test_parse_time():
    assert parse_time("90") == 90
    assert parse_time("1:30") == 90
    assert parse_time("1:02:03.5") == 3723.5
    for bad in ("", "a:b", "1:2:3:4", "-5"):
        with pytest.raises(ValueError):
            parse_time(bad)


def test_parse_range():
    assert parse_range("0:10-0:45") == (10, 45)
    with pytest.raises(ValueError):
        parse_range("45-10")
    with pytest.raises(ValueError):
        parse_range("45")


def test_srt():
    assert format_srt_time(3723.5) == "01:02:03,500"
    segs = segments_in_range([Segment(0, 5, "early"), Segment(8, 12, "hello there"), Segment(30, 35, "late")], 10, 20)
    assert [(s.start, s.end, s.text) for s in segs] == [(0, 2, "hello there")]
    assert to_srt(segs).startswith("1\n00:00:00,000 --> 00:00:02,000\nhello there")
    assert wrap_text("aaa bbb ccc", 7) == "aaa bbb\nccc"


def test_highlights_prefers_dense_exciting_speech():
    boring = [Segment(i * 5, i * 5 + 5, "um so yeah") for i in range(0, 8)]
    hot = [Segment(100 + i * 5, 105 + i * 5, "Why is this the biggest mistake? Stop doing it now! It costs 100 dollars") for i in range(6)]
    start, end, _ = find_highlights(boring + hot, count=1, min_len=20, max_len=40)[0]
    assert start >= 100
    assert find_highlights([], count=3) == []


def test_highlights_do_not_overlap():
    segs = [Segment(i * 5, i * 5 + 5, "how to learn this secret fast!") for i in range(40)]
    picks = find_highlights(segs, count=3, min_len=20, max_len=30)
    for (s1, e1, _), (s2, e2, _) in zip(picks, picks[1:]):
        assert e1 <= s2


needs_ffmpeg = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg not installed")


@pytest.fixture
def sample(tmp_path):
    path = tmp_path / "sample.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=25:duration=10",
         "-f", "lavfi", "-i", "sine=frequency=440:duration=10", "-c:v", "libx264", "-c:a", "aac", str(path)],
        check=True,
    )
    return str(path)


@needs_ffmpeg
def test_cut_ranges_vertical(sample, tmp_path):
    out = tmp_path / "out"
    main(["cut", sample, "1-3", "4-8", "--vertical", "-o", str(out)])
    files = sorted(os.listdir(out))
    assert files == ["sample_clip01.mp4", "sample_clip02.mp4"]
    assert abs(video.duration(str(out / files[0])) - 2) < 0.3
    assert abs(video.duration(str(out / files[1])) - 4) < 0.3
    dims = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
         "-of", "csv=p=0", str(out / files[0])], capture_output=True, text=True).stdout.strip()
    assert dims == "1080,1920"


@needs_ffmpeg
def test_cut_with_burned_captions(sample, tmp_path):
    ass = tmp_path / "c.ass"
    ass.write_text(to_ass([Segment(0, 1.5, "hello animated captions")], Style()))
    dst = tmp_path / "cap.mp4"
    video.cut(sample, str(dst), 0, 2, vertical=True, subs=str(ass))
    assert abs(video.duration(str(dst)) - 2) < 0.3


def test_ass_highlights_active_word_and_uppercases():
    seg = Segment(0, 3, "one two three", [Word(0, 1, "one"), Word(1, 2, "two"), Word(2, 3, "three")])
    out = to_ass([seg], Style(highlight="#FF0000", words_per_line=3))
    events = [l for l in out.splitlines() if l.startswith("Dialogue")]
    assert len(events) == 3
    assert "{\\c&H000000FF&}ONE{\\c&H00FFFFFF&} TWO THREE" in events[0]
    assert "PlayResX: 1080" in out and "PlayResY: 1920" in out


def test_ass_without_word_timing_spreads_words():
    out = to_ass([Segment(0, 4, "aaaa bbbb")], Style(uppercase=False, words_per_line=1))
    events = [l for l in out.splitlines() if l.startswith("Dialogue")]
    assert events[0].startswith("Dialogue: 0,0:00:00.00,0:00:02.00")
    assert events[1].startswith("Dialogue: 0,0:00:02.00,0:00:04.00")


def test_segments_in_range_clips_words():
    seg = Segment(8, 14, "a b c", [Word(8, 10, "a"), Word(10, 12, "b"), Word(12, 14, "c")])
    (out,) = segments_in_range([seg], 10, 13)
    assert [(w.text, w.start, w.end) for w in out.words] == [("b", 0, 2), ("c", 2, 3)]


def test_styles(tmp_path):
    assert load_style("karaoke").words_per_line == 2
    f = tmp_path / "s.json"
    f.write_text('{"font": "Impact", "size": 100}')
    st = load_style("pop", str(f), highlight="#00FF00", color=None)
    assert (st.font, st.size, st.highlight, st.color) == ("Impact", 100, "#00FF00", "#FFFFFF")
    with pytest.raises(ValueError):
        load_style("nope")
    f.write_text('{"fnot": 1}')
    with pytest.raises(ValueError):
        load_style("pop", str(f))


def test_highlights_support_two_minute_clips_and_scores():
    segs = [Segment(i * 10, i * 10 + 10, "Why is this the biggest mistake? Stop it now!") for i in range(30)]
    (start, end, score), = find_highlights(segs, count=1, min_len=100, max_len=120)
    assert 100 <= end - start <= 120
    assert 0 < score <= 100
    # no cap: a 3 minute window is allowed when asked for
    (s2, e2, _), = find_highlights(segs, count=1, min_len=170, max_len=200)
    assert e2 - s2 >= 170


@needs_ffmpeg
def test_auto_end_to_end_with_report(sample, tmp_path, monkeypatch):
    import json
    import clipper.transcribe as t
    words = [Word(i * 0.5, i * 0.5 + 0.5, f"word{i}") for i in range(20)]
    segs = [Segment(0, 5, "Why is this a mistake?", words[:10]), Segment(5, 10, "Stop doing it now!", words[10:])]
    monkeypatch.setattr(t, "transcribe", lambda *a, **k: segs)
    out = tmp_path / "o"
    main(["auto", sample, "-n", "1", "--min-length", "5", "--max-length", "10", "--vertical", "--reframe", "face",
          "--caption-style", "karaoke", "-o", str(out)])
    report = json.loads((out / "sample_report.json").read_text())
    assert report[0]["duration"] == 10 and report[0]["hook"].startswith("Why")
    assert os.path.exists(report[0]["file"])


@needs_ffmpeg
def test_missing_file_and_bad_start(sample, tmp_path):
    with pytest.raises(SystemExit):
        main(["cut", str(tmp_path / "nope.mp4"), "0-5"])
    with pytest.raises(SystemExit):
        main(["cut", sample, "50-60", "-o", str(tmp_path / "o")])
