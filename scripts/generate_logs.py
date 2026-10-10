"""Builds the 18 synthetic OM observation logs and their manifests.

Step A (LLM, generate-synthetic-data skill steps 3-4): for each log, a model writes filler
observation lines for 6 dated groups in Mastra's observation format, told which domain to use and
which subjects to avoid. Step B (deterministic): the planted fact lines from facts.py are inserted
at their positions and the check tokens are resolved (dates expanded into common formats).
Step C (filter, skill step 5): filler lines that contain any check token are dropped, so a fact can
only be found in the output if the Reflector kept the planted line.

Usage: GROQ_API_KEY=... python3 scripts/generate_logs.py   (filler cached in data/filler/)
"""
import datetime as dt, json, os, re, sys, time, unicodedata, urllib.request, pathlib

sys.path.insert(0, os.path.dirname(__file__))
from facts import LOGS, DOMAINS, TYPES, POSITIONS, ANCHOR_GROUP

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILLER = ROOT / "data" / "filler"; FILLER.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "data" / "logs"; OUT.mkdir(parents=True, exist_ok=True)
GEN_MODEL = "openai/gpt-oss-120b"  # Groq free tier, used only to write filler lines
OFFSETS = [0, 3, 6, 9, 13, 17]
BASE = dt.date(2026, 3, 2)

def group_dates(i):
    b = BASE + dt.timedelta(days=9 * i)
    return [b + dt.timedelta(days=o) for o in OFFSETS]

def resolve_date(tok, dates):
    m = re.fullmatch(r"\{d(\d)\+(\w+)\}", tok)
    g = dates[int(m.group(1))]
    if m.group(2) == "fri":
        d = g + dt.timedelta(days=1)
        while d.weekday() != 4: d += dt.timedelta(days=1)
        return d
    return g + dt.timedelta(days=int(m.group(2)))

def long_date(d): return f"{d:%B} {d.day}, {d.year}"

def date_alts(d):
    return sorted({f"{d:%B} {d.day}".lower(), f"{d:%b} {d.day}".lower(), f"{d.day} {d:%B}".lower(),
                   f"{d.day} {d:%b}".lower(), d.isoformat(), f"{d.month}/{d.day}/{d.year}",
                   f"{d.month:02d}/{d.day:02d}/{d.year}", f"{d:%b}. {d.day}".lower()})

def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("\u2019", "'").replace("\u2018", "'").replace("\u2013", "-").replace("\u2014", "-")
    s = re.sub(r"(?<=\d),(?=\d{3})", "", s)
    return s

def fill_text(text, dates):
    return re.sub(r"\{d\d\+\w+\}", lambda m: long_date(resolve_date(m.group(0), dates)), text)

def resolve_alts(alts, dates):
    out = []
    for a in alts:
        if re.fullmatch(r"\{d\d\+\w+\}", a): out += date_alts(resolve_date(a, dates))
        else: out.append(a)
    return out

def resolve_check(check, dates):
    c = {}
    for k in ("all", "sameLine"):
        if k in check: c[k] = [resolve_alts(g, dates) for g in check[k]]
    if "current" in check: c["current"] = check["current"]
    if "absent" in check: c["absent"] = check["absent"]
    return c

def key_tokens(check):
    """Tokens that identify the fact itself (not the generic co-occurrence words)."""
    t = []
    if "all" in check:
        for g in check["all"]: t += g
    if "sameLine" in check: t += check["sameLine"][0]
    if "current" in check: t += check["current"]["new"] + check["current"]["old"]
    if "absent" in check: t += check["absent"]
    return t

def has_tok(text, tok):
    pat = r"(?<![a-z0-9])" + re.escape(tok) + (r"(?![0-9])" if tok[-1].isdigit() else "")
    return re.search(pat, norm(text)) is not None

def groq(prompt):
    body = json.dumps({"model": GEN_MODEL, "temperature": 0.9, "messages": [{"role": "user", "content": prompt}],
                       "response_format": {"type": "json_object"}}).encode()
    for attempt in range(8):
        req = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=body, headers={
            "Authorization": "Bearer " + os.environ["GROQ_API_KEY"], "Content-Type": "application/json",
            "User-Agent": "reflector-fact-survival/0.1"})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            msg = e.read()[:300]
            print("groq", e.code, msg, file=sys.stderr)
            m = re.search(rb"try again in ([\d.]+)s", msg)
            time.sleep(float(m.group(1)) + 1 if m else 15)
    raise RuntimeError("groq failed")

PROMPT = """We are generating synthetic memory logs for testing an AI assistant's memory compression.
The assistant serves {domain}.
An observer agent watches each conversation and writes dated observation lines. Write the filler
observations for one date: {date}. The dates of the whole log are {dates}; this is date {n} of 6.
{story}

Format rules for every line:
- Start with a priority emoji: 🔴 for facts the user stated about themselves or firm decisions,
  🟡 for task progress, tool calls and assistant actions, 🟢 for minor or passing details.
- Then a 24h time in parentheses, then one sentence, e.g. "🟡 (14:05) Agent compared three quotes and found the cheapest was the local supplier."
- Mix: things the user stated ("User stated ..."), questions the user asked ("User asked ..."),
  assistant actions and tool calls ("Agent searched ...", "Agent ran ..."), and completed work ("✅ ...").
- Use specific but invented details (names, numbers, places) so the log feels real.
- Exactly 14 lines, times ascending, between 07:00 and 22:00. Move the story forward from earlier dates.

The log already contains these lines (written elsewhere). Do NOT repeat, rephrase, contradict, or mention
their subjects, people, numbers, places, or dates at all:
{planted}

Return JSON: {{"date": "{date}", "lines": ["..."]}}"""

def build(i, log):
    dates = group_dates(i)
    domain = log["domain"]
    planted = []  # (group, time, text, fact_index)
    manifest_facts = []
    for fi, f in enumerate(log["facts"]):
        pos = POSITIONS[fi]
        anchor = ANCHOR_GROUP[pos]
        offs = [o for o, _, _ in f["lines"]]
        shift = max(0, -(anchor + min(offs)))
        groups = []
        for o, t, text in f["lines"]:
            g = anchor + o + shift
            planted.append((g, t, fill_text(text, dates), fi)); groups.append(g)
        check = resolve_check(f["check"], dates)
        manifest_facts.append({"id": f"log{i:02d}-f{fi}", "type": f["type"], "typeName": TYPES[f["type"]],
                               "position": pos, "groups": groups,
                               "plantedLines": [fill_text(x[2], dates) for x in f["lines"]], "check": check})
    cache = FILLER / f"log{i:02d}.json"
    cached = json.loads(cache.read_text()) if cache.exists() else {"model": GEN_MODEL, "groups": []}
    if len(cached.get("groups", [])) != 6: cached = {"model": GEN_MODEL, "groups": cached.get("groups", [])[:0] if "prompt" in cached else cached.get("groups", [])}
    while len(cached["groups"]) < 6:
        g = len(cached["groups"])
        story = ""
        if g:
            prev = "\n".join(cached["groups"][-1]["response"]["lines"])
            story = "Observations from the previous date (for continuity, do not repeat them):\n" + prev
        p = PROMPT.format(domain=DOMAINS[domain], date=f"{dates[g]:%b} {dates[g].day}, {dates[g].year}", n=g + 1,
                          dates=", ".join(f"{d:%b} {d.day}, {d.year}" for d in dates), story=story,
                          planted="\n".join("- " + x[2][2:] for x in planted))
        resp = json.loads(groq(p))
        if len(resp.get("lines", [])) < 8: continue
        cached["groups"].append({"prompt": p, "response": resp})
        cache.write_text(json.dumps(cached, ensure_ascii=False, indent=1))
    data = {"groups": [grp["response"] for grp in cached["groups"]]}
    tokens = [t for mf in manifest_facts for t in key_tokens(mf["check"])]
    dropped = []
    out_lines, n_filler = [], 0
    for g, d in enumerate(dates):
        lines = []
        for ln in data["groups"][g]["lines"]:
            ln = ln.strip().lstrip("*- ").strip()
            m = re.match(r"^(\S+)\s*\((\d{1,2}:\d{2})\)\s*(.*)$", ln)
            if not m: dropped.append(("format", ln)); continue
            if any(has_tok(ln, t) for t in tokens): dropped.append(("token", ln)); continue
            lines.append((m.group(2).zfill(5), f"* {m.group(1)} ({m.group(2).zfill(5)}) {m.group(3)}"))
            n_filler += 1
        for pg, t, text, fi in planted:
            if pg == g:
                emoji, rest = text.split(" ", 1)
                lines.append((t, f"* {emoji} ({t}) {rest}"))
        lines.sort(key=lambda x: x[0])
        out_lines.append(f"Date: {d:%b} {d.day}, {d.year}")
        out_lines += [l for _, l in lines]
        out_lines.append("")
    text = "\n".join(out_lines).strip() + "\n"
    # headers must not leak a date token either
    for mf in manifest_facts:
        for t in key_tokens(mf["check"]):
            hits = [l for l in text.splitlines() if has_tok(l, t) and not any(norm(pl.split(" ", 1)[1])[:40] in norm(l) for pl in mf["plantedLines"])]
            assert not hits, (i, t, hits)
    (OUT / f"log{i:02d}.md").write_text(text)
    manifest = {"id": f"log{i:02d}", "domain": domain, "dates": [d.isoformat() for d in dates],
                "fillerModel": GEN_MODEL, "fillerLines": n_filler, "droppedFiller": dropped, "facts": manifest_facts}
    (OUT / f"log{i:02d}.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    return n_filler, len(dropped)

if __name__ == "__main__":
    only = [int(a) for a in sys.argv[1:]] or range(len(LOGS))
    for i in only:
        n, d = build(i, LOGS[i])
        print(f"log{i:02d}: {n} filler lines kept, {d} dropped", flush=True)
