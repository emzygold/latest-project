"""Parse and format timestamps like 90, 1:30, 01:02:03 or 1:30.5."""


def parse_time(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    parts = str(value).strip().split(":")
    if not 1 <= len(parts) <= 3:
        raise ValueError(f"bad timestamp: {value!r}")
    try:
        nums = [float(p) for p in parts]
    except ValueError:
        raise ValueError(f"bad timestamp: {value!r}") from None
    seconds = 0.0
    for n in nums:
        seconds = seconds * 60 + n
    if seconds < 0:
        raise ValueError(f"negative timestamp: {value!r}")
    return seconds


def format_srt_time(seconds: float) -> str:
    ms = int(round(max(seconds, 0) * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def parse_range(text: str) -> tuple:
    """'1:30-2:15' -> (90.0, 135.0)."""
    if "-" not in text:
        raise ValueError(f"range must look like START-END, got {text!r}")
    start, end = text.split("-", 1)
    start, end = parse_time(start), parse_time(end)
    if end <= start:
        raise ValueError(f"end must be after start in {text!r}")
    return start, end
