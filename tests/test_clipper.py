import os
import shutil
import subprocess

import pytest

from clipper import video
from clipper.captions import Segment, segments_in_range, to_srt, wrap_text
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
    srt = tmp_path / "c.srt"
    srt.write_text(to_srt([Segment(0, 1.5, "hello captions")]))
    dst = tmp_path / "cap.mp4"
    video.cut(sample, str(dst), 0, 2, vertical=True, srt=str(srt))
    assert abs(video.duration(str(dst)) - 2) < 0.3


@needs_ffmpeg
def test_missing_file_and_bad_start(sample, tmp_path):
    with pytest.raises(SystemExit):
        main(["cut", str(tmp_path / "nope.mp4"), "0-5"])
    with pytest.raises(SystemExit):
        main(["cut", sample, "50-60", "-o", str(tmp_path / "o")])
