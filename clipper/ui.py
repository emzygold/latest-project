"""The single page served by `clipper serve`."""

INDEX_HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clipper</title>
<style>
:root {
  --bg: #f6f6f4; --panel: #ffffff; --text: #17171a; --muted: #6b6b73; --line: #e3e3e0;
  --accent: #ff3b7f; --accent-ink: #ffffff; --good: #138a4a; --bad: #c2273d; --field: #fbfbfa;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #111114; --panel: #1a1a1f; --text: #ececf0; --muted: #9a9aa5; --line: #2c2c33;
          --accent: #ff4d8b; --accent-ink: #ffffff; --good: #3ccf7f; --bad: #ff6b7d; --field: #141418; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
       font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1040px; margin: 0 auto; padding: 32px 16px 64px; }
header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 24px; }
h1 { font-size: 26px; margin: 0; letter-spacing: -0.02em; }
h1 span { color: var(--accent); }
header p { margin: 0; color: var(--muted); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 18px; }
.card h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 0 0 12px; }
label { display: block; font-size: 13px; color: var(--muted); margin: 10px 0 4px; }
input, select, textarea { width: 100%; padding: 9px 10px; border-radius: 9px; border: 1px solid var(--line);
  background: var(--field); color: var(--text); font: inherit; }
input[type=color] { padding: 2px; height: 38px; }
input[type=checkbox] { width: auto; margin-right: 8px; accent-color: var(--accent); }
.check { display: flex; align-items: center; color: var(--text); font-size: 14px; margin-top: 12px; }
.row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.drop { border: 2px dashed var(--line); border-radius: 12px; padding: 22px; text-align: center; cursor: pointer;
        color: var(--muted); transition: border-color .15s; }
.drop.over, .drop:hover { border-color: var(--accent); }
.drop strong { color: var(--text); }
.or { text-align: center; color: var(--muted); font-size: 12px; margin: 10px 0 0; }
.tabs { display: flex; gap: 6px; background: var(--field); border: 1px solid var(--line); border-radius: 10px; padding: 4px; }
.tabs button { flex: 1; border: 0; background: transparent; color: var(--muted); padding: 8px; border-radius: 7px;
               font: inherit; cursor: pointer; }
.tabs button.on { background: var(--panel); color: var(--text); box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.hidden { display: none; }
.go { margin-top: 16px; width: 100%; padding: 14px; border: 0; border-radius: 12px; background: var(--accent);
      color: var(--accent-ink); font: 600 16px system-ui, sans-serif; cursor: pointer; }
.go:disabled { opacity: .5; cursor: progress; }
.bar { height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; margin-top: 12px; }
.bar div { height: 100%; width: 0; background: var(--accent); transition: width .2s; }
pre { background: var(--field); border: 1px solid var(--line); border-radius: 10px; padding: 12px; margin: 12px 0 0;
      max-height: 220px; overflow: auto; font-size: 12.5px; white-space: pre-wrap; word-break: break-word; }
.status { font-weight: 600; }
.status.error { color: var(--bad); } .status.done { color: var(--good); }
.clips { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; }
.clip { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.clip video { width: 100%; display: block; background: #000; max-height: 420px; }
.clip .meta { padding: 12px; }
.score { display: inline-block; font-weight: 700; font-size: 13px; padding: 2px 8px; border-radius: 99px;
         background: var(--accent); color: var(--accent-ink); }
.hook { margin: 8px 0; font-size: 14px; }
.small { color: var(--muted); font-size: 12.5px; }
.clip a { color: var(--accent); font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
<main>
  <header><h1>Clip<span>per</span></h1><p>Long videos in, short viral clips out. Free and runs on your computer.</p></header>

  <div class="grid">
    <section class="card">
      <h2>1. Video</h2>
      <div class="drop" id="drop"><strong>Drop a video here</strong><br>or click to choose a file
        <div id="fileName" class="small"></div></div>
      <input type="file" id="file" accept="video/*" class="hidden">
      <p class="or">OR PASTE A LINK (YouTube etc.)</p>
      <input id="url" placeholder="https://youtube.com/watch?v=...">

      <h2 style="margin-top:20px">2. How to clip</h2>
      <div class="tabs"><button id="tAuto" class="on" type="button">AI picks the best moments</button>
        <button id="tCut" type="button">I choose the times</button></div>
      <div id="autoBox">
        <div class="row">
          <div><label>Clips</label><input id="count" type="number" min="1" max="30" value="5"></div>
          <div><label>Min length (s)</label><input id="minLen" type="number" min="5" value="30"></div>
          <div><label>Max length (s)</label><input id="maxLen" type="number" min="10" value="120"></div>
        </div>
      </div>
      <div id="cutBox" class="hidden">
        <label>Time ranges, one per line (e.g. 1:30-3:45)</label>
        <textarea id="ranges" rows="3" placeholder="0:45-2:30&#10;10:00-11:15"></textarea>
      </div>
      <label class="check"><input type="checkbox" id="captions" checked>Animated captions</label>
    </section>

    <section class="card">
      <h2>3. Look</h2>
      <label class="check" style="margin-top:0"><input type="checkbox" id="vertical" checked>Vertical 9:16 (TikTok, Reels, Shorts)</label>
      <div class="row2">
        <div><label>Framing</label><select id="reframe"><option value="face">Follow the face</option><option value="center">Centre</option></select></div>
        <div><label>Caption style</label><select id="style"><option value="pop">Pop</option><option value="clean">Clean</option><option value="karaoke">Karaoke</option></select></div>
      </div>
      <div class="row">
        <div><label>Text color</label><input id="color" type="color" value="#ffffff"></div>
        <div><label>Highlight</label><input id="highlight" type="color" value="#ffe600"></div>
        <div><label>Position</label><select id="position"><option value="bottom">Bottom</option><option value="middle">Middle</option><option value="top">Top</option></select></div>
      </div>
      <div class="row2">
        <div><label>Font</label><input id="font" placeholder="Arial"></div>
        <div><label>Font size</label><input id="size" type="number" min="20" max="200" placeholder="84"></div>
      </div>
      <div class="row2">
        <div><label>Caption accuracy</label><select id="model"><option value="tiny">Fastest</option><option value="base" selected>Balanced</option><option value="small">Accurate (slower)</option><option value="medium">Best (slowest)</option></select></div>
        <div><label>Language</label><select id="language"><option value="">Auto-detect</option><option value="en">English</option><option value="es">Spanish</option><option value="de">German</option><option value="fr">French</option><option value="yo">Yoruba</option></select></div>
      </div>
      <button class="go" id="go" type="button">Make clips</button>
      <div class="bar hidden" id="bar"><div></div></div>
      <p class="status" id="status"></p>
      <pre id="log" class="hidden"></pre>
    </section>
  </div>

  <section class="clips" id="clips"></section>
</main>
<script>
const $ = id => document.getElementById(id);
let mode = "auto", file = null, timer = null;

$("tAuto").onclick = () => setMode("auto");
$("tCut").onclick = () => setMode("cut");
function setMode(m) {
  mode = m;
  $("tAuto").classList.toggle("on", m === "auto");
  $("tCut").classList.toggle("on", m === "cut");
  $("autoBox").classList.toggle("hidden", m !== "auto");
  $("cutBox").classList.toggle("hidden", m !== "cut");
  $("captions").checked = m === "auto";
}

const drop = $("drop");
drop.onclick = () => $("file").click();
$("file").onchange = e => pick(e.target.files[0]);
drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); pick(e.dataTransfer.files[0]); };
function pick(f) {
  if (!f) return;
  file = f;
  $("fileName").textContent = `${f.name} (${(f.size / 1048576).toFixed(1)} MB)`;
  $("url").value = "";
}

function setStatus(text, cls = "") { $("status").textContent = text; $("status").className = "status " + cls; }

function upload(f) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload?name=" + encodeURIComponent(f.name));
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    $("bar").classList.remove("hidden");
    xhr.upload.onprogress = e => { if (e.lengthComputable) $("bar").firstElementChild.style.width = (100 * e.loaded / e.total) + "%"; };
    xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText).upload) : reject(new Error("Upload failed"));
    xhr.onerror = () => reject(new Error("Upload failed. Is Clipper still running?"));
    xhr.send(f);
  });
}

$("go").onclick = async () => {
  const url = $("url").value.trim();
  if (!file && !url) return setStatus("Choose a video or paste a link first.", "error");
  $("go").disabled = true; $("clips").innerHTML = ""; $("log").textContent = ""; $("log").classList.remove("hidden");
  try {
    const body = {
      mode, captions: $("captions").checked, vertical: $("vertical").checked, reframe: $("reframe").value,
      caption_style: $("style").value, caption_color: $("color").value, highlight_color: $("highlight").value,
      caption_position: $("position").value, font: $("font").value.trim(), caption_size: $("size").value,
      model: $("model").value, language: $("language").value,
      count: $("count").value, min_length: $("minLen").value, max_length: $("maxLen").value, ranges: $("ranges").value,
    };
    if (file) { setStatus("Uploading..."); body.upload = await upload(file); } else body.url = url;
    setStatus("Starting...");
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    poll(data.job);
  } catch (e) { setStatus(e.message, "error"); $("go").disabled = false; }
};

function poll(job) {
  clearInterval(timer);
  timer = setInterval(async () => {
    let data;
    try { data = await (await fetch("/api/jobs/" + job)).json(); } catch { return; }
    $("log").textContent = data.log.join("\n");
    $("log").scrollTop = $("log").scrollHeight;
    if (data.status === "queued") setStatus("Waiting for the previous job to finish...");
    if (data.status === "running") setStatus("Working... long videos can take a while.");
    if (data.status === "done" || data.status === "error") {
      clearInterval(timer); $("go").disabled = false; $("bar").classList.add("hidden");
      if (data.status === "done") { setStatus(`Done: ${data.clips.length} clip(s).`, "done"); show(data.clips); }
      else setStatus("Something went wrong. See the log.", "error");
    }
  }, 1500);
}

function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
function show(clips) {
  $("clips").innerHTML = clips.map(c => `
    <article class="clip">
      <video src="${c.url}#t=0.1" controls preload="metadata" playsinline></video>
      <div class="meta">
        ${c.virality !== null ? `<span class="score">${c.virality}/100</span>` : ""}
        <p class="hook">${esc(c.hook) || "<span class=small>No captions</span>"}</p>
        <p class="small">${Math.floor(c.start / 60)}:${String(Math.floor(c.start % 60)).padStart(2, "0")} &middot; ${c.duration}s</p>
        <a href="${c.url}?download=1">Download</a>
      </div>
    </article>`).join("");
}
</script>
</body>
</html>
"""
