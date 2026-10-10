"""Records video/scenes.html with headless Playwright, then encodes 1280x720 H.264 with ffmpeg.
The page stays black until window.__start() is called, so the lead-in can be trimmed exactly."""
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else HERE / "demo.mp4")
TOTAL = float(sys.argv[2]) if len(sys.argv) > 2 else 75.0
tmp = HERE / "rec"; tmp.mkdir(exist_ok=True)
for f in tmp.glob("*.webm"): f.unlink()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1280, "height": 720}, record_video_dir=str(tmp),
                        record_video_size={"width": 1280, "height": 720}, device_scale_factor=1)
    t0 = time.monotonic()
    page = ctx.new_page()
    page.goto((HERE / "scenes.html").as_uri())
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready")
    time.sleep(1.0)
    page.evaluate("window.__start()")
    start = time.monotonic() - t0
    time.sleep(TOTAL + 1.5)
    ctx.close(); b.close()

webm = next(tmp.glob("*.webm"))
print("lead-in", round(start, 2), "s")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start + 0.15:.2f}", "-i", str(webm), "-t", f"{TOTAL:.2f}",
                "-vf", "scale=1280:720,fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
                "-profile:v", "high", "-movflags", "+faststart", "-an", str(OUT)], check=True)
print(json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration",
                                 "-of", "json", str(OUT)], capture_output=True, text=True).stdout))
