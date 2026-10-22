"""Local web app: `clipper serve`, then open http://127.0.0.1:8000.

Standard library only. Jobs run one at a time in a background thread
(clipping is CPU-heavy), and the page polls for progress.
"""

import json
import os
import re
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

from .ui import INDEX_HTML

CHUNK = 1024 * 1024
SAFE_NAME = re.compile(r"[^\w.\- ]+")


class State:
    def __init__(self, workdir: str):
        self.workdir = os.path.abspath(workdir)
        self.uploads = os.path.join(self.workdir, "uploads")
        self.jobs_dir = os.path.join(self.workdir, "jobs")
        os.makedirs(self.uploads, exist_ok=True)
        os.makedirs(self.jobs_dir, exist_ok=True)
        self.jobs = {}
        self.lock = threading.Lock()
        self.runner = threading.Semaphore(1)


def build_argv(opts: dict, source: str, outdir: str) -> list:
    """Turn the form's JSON into CLI arguments, so the CLI parser validates them."""
    mode = opts.get("mode", "auto")
    if mode not in ("auto", "cut"):
        raise ValueError("mode must be auto or cut")
    argv = [mode, source, "-o", outdir]
    if mode == "auto":
        for key, flag in (("count", "-n"), ("min_length", "--min-length"), ("max_length", "--max-length")):
            if opts.get(key) not in (None, ""):
                argv += [flag, str(opts[key])]
        if not opts.get("captions", True):
            argv.append("--no-captions")
    else:
        ranges = str(opts.get("ranges", "")).replace(",", " ").split()
        if not ranges:
            raise ValueError("add at least one time range, e.g. 1:30-3:00")
        argv += ranges
        if opts.get("captions"):
            argv.append("--captions")
    if opts.get("vertical", True):
        argv.append("--vertical")
    for key, flag in (("reframe", "--reframe"), ("caption_style", "--caption-style"), ("font", "--font"),
                      ("caption_color", "--caption-color"), ("highlight_color", "--highlight-color"),
                      ("caption_position", "--caption-position"), ("caption_size", "--caption-size"),
                      ("model", "--model"), ("language", "--language")):
        if opts.get(key) not in (None, ""):
            argv += [flag, str(opts[key])]
    return argv


def run_job(state: State, job_id: str, args) -> None:
    job = state.jobs[job_id]

    def log(msg):
        with state.lock:
            job["log"].append(str(msg).replace(args.output + os.sep, ""))

    with state.runner:
        job["status"] = "running"
        try:
            clips = args.func(args, log=log)
            for c in clips:
                c["url"] = f"/files/{job_id}/{quote(os.path.basename(c['file']))}"
                c["file"] = os.path.basename(c["file"])
            job["clips"] = clips
            job["status"] = "done"
        except SystemExit as e:
            log(str(e.code) if e.code not in (None, 0) else "Stopped.")
            job["status"] = "error"
        except Exception as e:  # keep the server alive whatever a job does
            log(f"Unexpected error: {e!r}")
            job["status"] = "error"


def make_handler(state: State):
    from .cli import build_parser

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *a):
            pass

        def _json(self, code, obj):
            body = json.dumps(obj).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            path = urlparse(self.path).path
            if path == "/":
                body = INDEX_HTML.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif path.startswith("/api/jobs/"):
                job = state.jobs.get(path.rsplit("/", 1)[1])
                if not job:
                    return self._json(404, {"error": "no such job"})
                with state.lock:
                    self._json(200, {k: job[k] for k in ("status", "log", "clips")})
            elif path.startswith("/files/"):
                self._send_file(path)
            else:
                self._json(404, {"error": "not found"})

        def _send_file(self, path):
            parts = path.split("/")
            if len(parts) != 4 or parts[2] not in state.jobs:
                return self._json(404, {"error": "not found"})
            name = os.path.basename(unquote(parts[3]))
            full = os.path.join(state.jobs_dir, parts[2], name)
            if not os.path.isfile(full):
                return self._json(404, {"error": "not found"})
            size = os.path.getsize(full)
            start, end = 0, size - 1
            m = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
            if m and (m.group(1) or m.group(2)):
                if m.group(1):
                    start = int(m.group(1))
                    end = int(m.group(2)) if m.group(2) else end
                else:
                    start = max(size - int(m.group(2)), 0)
                end = min(end, size - 1)
                if start > end:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            else:
                self.send_response(200)
            ctype = "application/json" if name.endswith(".json") else "video/mp4"
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            if "download" in parse_qs(urlparse(self.path).query):
                self.send_header("Content-Disposition", f'attachment; filename="{name}"')
            self.end_headers()
            try:
                with open(full, "rb") as f:
                    f.seek(start)
                    left = end - start + 1
                    while left > 0:
                        chunk = f.read(min(CHUNK, left))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass  # the browser stops reading when the user seeks

        def do_POST(self):
            url = urlparse(self.path)
            length = int(self.headers.get("Content-Length") or 0)
            if url.path == "/api/upload":
                name = SAFE_NAME.sub("_", os.path.basename(parse_qs(url.query).get("name", ["video.mp4"])[0])) or "video.mp4"
                token = f"{uuid.uuid4().hex[:8]}_{name}"
                with open(os.path.join(state.uploads, token), "wb") as f:
                    left = length
                    while left > 0:
                        chunk = self.rfile.read(min(CHUNK, left))
                        if not chunk:
                            break
                        f.write(chunk)
                        left -= len(chunk)
                return self._json(200, {"upload": token})
            if url.path == "/api/jobs":
                try:
                    opts = json.loads(self.rfile.read(length) or b"{}")
                except ValueError:
                    return self._json(400, {"error": "bad JSON"})
                if opts.get("upload"):
                    source = os.path.join(state.uploads, os.path.basename(opts["upload"]))
                    if not os.path.isfile(source):
                        return self._json(400, {"error": "upload not found, please upload again"})
                elif str(opts.get("url", "")).startswith(("http://", "https://")):
                    source = opts["url"]
                else:
                    return self._json(400, {"error": "upload a video or paste a link"})
                job_id = uuid.uuid4().hex[:10]
                outdir = os.path.join(state.jobs_dir, job_id)
                try:
                    args = build_parser().parse_args(build_argv(opts, source, outdir))
                except ValueError as e:
                    return self._json(400, {"error": str(e)})
                except SystemExit:
                    return self._json(400, {"error": "some options are invalid, check the numbers and colors"})
                state.jobs[job_id] = {"status": "queued", "log": [], "clips": []}
                threading.Thread(target=run_job, args=(state, job_id, args), daemon=True).start()
                return self._json(200, {"job": job_id})
            self._json(404, {"error": "not found"})

    return Handler


def serve(host: str = "127.0.0.1", port: int = 8000, workdir: str = "clipper_web") -> None:
    state = State(workdir)
    try:
        httpd = ThreadingHTTPServer((host, port), make_handler(state))
    except OSError as e:
        raise SystemExit(f"Could not start on port {port} ({e.strerror}). Try: clipper serve --port 8001")
    shown = "127.0.0.1" if host in ("0.0.0.0", "") else host
    print(f"Clipper is running:  http://{shown}:{port}\nFiles are saved in {state.workdir}. Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()
