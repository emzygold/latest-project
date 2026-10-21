"""Face-aware framing for vertical export (needs opencv: pip install "opencv-python-headless<5")."""

import statistics
from typing import Optional


def face_center_x(path: str, start: float, end: float, samples: int = 12) -> Optional[float]:
    """Median horizontal face position (0..1) over the clip, or None if no face found.

    One steady crop per clip is deliberate: constantly moving crops feel jittery.
    """
    try:
        import cv2
    except ImportError:
        raise SystemExit("Face reframing needs OpenCV:  pip install 'opencv-python-headless<5'")
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return None
    xs = []
    try:
        for i in range(samples):
            t = start + (end - start) * (i + 0.5) / samples
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
            ok, frame = cap.read()
            if not ok:
                continue
            h, w = frame.shape[:2]
            scale = 480 / h if h > 480 else 1.0
            small = cv2.resize(frame, (int(w * scale), int(h * scale)))
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
            if len(faces):
                x, _y, fw, _fh = max(faces, key=lambda f: f[2] * f[3])
                xs.append((x + fw / 2) / small.shape[1])
    finally:
        cap.release()
    return statistics.median(xs) if xs else None
