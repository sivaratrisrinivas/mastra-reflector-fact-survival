"""Writes video/scenes.html from results/<model>/results.json and hand-check/summary.json.
Usage: python3 video/make_scenes.py <model-dir-name>"""
import json, pathlib, sys, html
ROOT = pathlib.Path(__file__).resolve().parent.parent
model = sys.argv[1]
R = json.loads((ROOT / "results" / model / "results.json").read_text())
labels = json.loads((ROOT / "data" / "fact_labels.json").read_text())
hc = json.loads((ROOT / "hand-check" / "summary.json").read_text())
ex = json.loads((ROOT / "video" / "example.json").read_text())
default = json.loads((ROOT / "results" / "gemini-2.5-flash" / "results.json").read_text())
E = html.escape
S = {(s["ref"], s["level"]): s for s in R["summary"]}

def lost_at(level):
    out = {}
    for l in R["lost"]:
        if l["level"] == level: out.setdefault(l["fact"], set()).add(l["ref"])
    return out

rows = ""
for lv in [1, 2, 3, 4]:
    lost = lost_at(lv)
    chips = ""
    for fid, refs in sorted(lost.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        tag = "both" if len(refs) == 2 else ("main only" if "main" in refs else "PR only")
        chips += f'<span class="chip {"b" if len(refs)==2 else "o"}">{E(labels[fid])} <i>{tag}</i></span>'
    rows += f'<div class="lvrow"><div class="lv">Level {lv}</div><div class="chips">{chips or "<span class=none>nothing lost</span>"}</div></div>'

table = ""
for lv in [1, 2, 3, 4]:
    a, b = S[("main", lv)], S[("pr26465", lv)]
    table += f"<tr><td>Level {lv}</td><td>{a['factsKept']}/{a['factsTotal']}</td><td>{b['factsKept']}/{b['factsTotal']}</td><td>{a['meanOutputToInputTokens']}x / {b['meanOutputToInputTokens']}x</td></tr>"
dS = {(s["ref"], s["level"]): s for s in default["summary"]}
d4a, d4b = dS[("main", 4)], dS[("pr26465", 4)]

scenes = [
 (9, f'''<div class="big">Mastra's Reflector rewrites an agent's old memory into a shorter log.</div>
        <div class="sub">Whatever it drops, the agent no longer knows.</div>
        <div class="q">So which facts get lost at each compression level?</div>'''),
 (15, f'''<div class="h">Facts the code check marked lost, by level</div><div class="note">18 synthetic logs, 51 planted facts per run. Chip = one fact. Model {E(R["modelsSeen"][0].split(":")[1])}.</div>{rows}'''),
 (11, f'''<div class="h">Example: {E(ex["title"])}</div>
        <div class="lbl">Planted in the log</div><div class="code in">{E(ex["planted"])}</div>
        <div class="lbl">Reflector output, level {ex["level"]} ({E(ex["ref"])})</div><div class="code out">{"<br>".join(E(x) for x in ex["context"])}</div>
        <div class="note">{E(ex["caption"])}</div>'''),
 (10, f'''<div class="h">How it was measured</div><ul>
        <li>18 synthetic memory logs in Observational Memory format, 3 planted facts each (18 fact types x 3)</li>
        <li>Mastra's own Reflector prompt code, bundled unmodified from two refs: main and PR #26465 (open)</li>
        <li>Compression levels 1 to 4, one call per log per level per ref, temperature 0</li>
        <li>Survival counted by code only (token and same-line rules). No LLM judge</li></ul>'''),
 (13, f'''<div class="h">Planted facts kept (out of 51)</div>
        <table><tr><th></th><th>main</th><th>PR #26465</th><th>output / input size</th></tr>{table}</table>
        <div class="note">Model: {E(R["modelsSeen"][0].split(":")[1])}, all 144 calls. Default Reflector model gemini-2.5-flash hit its free cap (20/day): level 4 only, first {d4a["logsRun"]} logs ({d4b["logsRun"]} on PR): main {d4a["factsKept"]}/{d4a["factsTotal"]}, PR {d4b["factsKept"]}/{d4b["factsTotal"]}.</div>'''),
 (8, f'''<div class="h">Is the code check right?</div>
        <div class="big2">{hc["outputs"]} outputs, {hc["judgments"]} facts read in full, blind to the check</div>
        <div class="note">Read by the agent that built this, not an independent human rater.</div><div class="sub2">False misses (check said lost, fact was there): <b>{hc["falseMisses"]}</b><br>False hits (check said kept, fact was gone or wrong): <b>{hc["falseHits"]}</b><br>Agreement: <b>{hc["agreementPct"]}%</b></div>'''),
 (9, f'''<div class="h">Limits</div><ul>
        <li>Small logs (about 2.5k tokens), one seed, fact counts of 3 per type</li>
        <li>A measurement to help the level-1 follow-up, not a verdict on either ref</li></ul>
        <div class="repo">github.com/sivaratrisrinivas/mastra-reflector-fact-survival</div><div class="note">Built on Mastra (Apache-2.0). Not affiliated with Mastra.</div>'''),
]
assert sum(d for d, _ in scenes) == 75, sum(d for d, _ in scenes)
divs = "".join(f'<section id="s{i}">{c}</section>' for i, (_, c) in enumerate(scenes))
durs = json.dumps([d for d, _ in scenes])
page = f'''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:1280px;height:720px;background:#000;overflow:hidden;font-family:Inter,"Noto Color Emoji",sans-serif;color:#eef0f3}}
section{{position:absolute;inset:0;padding:56px 72px;box-sizing:border-box;background:#0f1218;opacity:0;transition:opacity .5s}}
section.on{{opacity:1}}
.big{{font-size:46px;font-weight:700;line-height:1.2;margin-top:110px}} .sub{{font-size:32px;color:#ffb86b;margin-top:28px}}
.q{{font-size:28px;color:#9aa4b2;margin-top:60px}}
.h{{font-size:34px;font-weight:700;margin-bottom:14px}} .note{{font-size:18px;color:#9aa4b2;margin:10px 0 18px}}
.lvrow{{display:flex;gap:18px;align-items:flex-start;margin:12px 0;opacity:0;transform:translateY(8px);transition:all .5s}}
.on .lvrow{{opacity:1;transform:none}} .on .lvrow:nth-child(4){{transition-delay:.8s}} .on .lvrow:nth-child(5){{transition-delay:2.3s}} .on .lvrow:nth-child(6){{transition-delay:3.8s}} .on .lvrow:nth-child(7){{transition-delay:5.3s}}
.lv{{width:110px;flex:none;font-size:22px;font-weight:700;padding-top:6px}}
.chips{{display:flex;flex-wrap:wrap;gap:8px}}
.chip{{font-size:16px;padding:6px 10px;border-radius:8px;background:#2a1d1d;border:1px solid #c0504d}} .chip.o{{background:#22232b;border-color:#6b7280}}
.chip i{{font-style:normal;color:#9aa4b2;font-size:13px;margin-left:4px}} .none{{color:#7bd88f;font-size:18px;padding-top:6px}}
.lbl{{font-size:18px;color:#9aa4b2;margin:18px 0 6px}}
.code{{font-family:"JetBrains Mono",monospace;font-size:17px;line-height:1.5;padding:14px 16px;border-radius:8px;background:#161b24}}
.code.in{{border-left:4px solid #ffb86b}} .code.out{{border-left:4px solid #6b7280;color:#c9d1d9}}
ul{{font-size:26px;line-height:1.5;padding-left:28px}} li{{margin:12px 0}}
table{{border-collapse:collapse;font-size:28px;margin-top:10px}} td,th{{padding:12px 30px;border-bottom:1px solid #2a3140;text-align:left}} th{{color:#9aa4b2;font-weight:600;font-size:22px}}
.big2{{font-size:38px;font-weight:700;margin:40px 0 24px}} .sub2{{font-size:28px;line-height:1.7}} b{{color:#ffb86b}}
.repo{{font-family:"JetBrains Mono",monospace;font-size:26px;color:#7cc4ff;margin-top:50px}}
</style></head><body>{divs}<script>
const d={durs};window.__start=()=>{{let t=0;d.forEach((x,i)=>{{setTimeout(()=>{{document.querySelectorAll('section').forEach(s=>s.classList.remove('on'));document.getElementById('s'+i).classList.add('on')}},t*1000);t+=x}});}};
</script></body></html>'''
(ROOT / "video" / "scenes.html").write_text(page)
print("ok")
