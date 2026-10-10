"""Picks ~20 Reflector outputs for a hand check of the code checker and writes hand-check/sample.md
(blind: no checker verdicts). Stratified: 10 outputs where the checker marked at least one fact lost
(where paraphrase misses would hide) and 10 others, spread across refs and levels. Seed fixed."""
import csv, json, random, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
model = sys.argv[1]
rows = list(csv.DictReader(open(ROOT / "results" / model / "per-fact.csv")))
outs = {}
for r in rows: outs.setdefault((r["ref"], int(r["level"]), r["log"]), []).append(r)
fail = [k for k, v in outs.items() if any(x["pass"] == "false" and x["type"] != "18" for x in v)]
ok = [k for k in outs if k not in fail]
rnd = random.Random(26465)
rnd.shuffle(fail); rnd.shuffle(ok)
def spread(keys, n):
    picked, seen = [], set()
    for k in keys:  # one per (ref, level) first, then fill
        if (k[0], k[1]) not in seen: picked.append(k); seen.add((k[0], k[1]))
        if len(picked) == n: return picked
    return picked + [k for k in keys if k not in picked][: n - len(picked)]
sample = spread(fail, 10) + spread(ok, 10)
md = "# Hand-check sample (blind)\n\n"
for i, (ref, lv, log) in enumerate(sample):
    rec = json.load(open(ROOT / "raw" / model / ref / f"L{lv}" / f"{log}.json"))
    man = json.load(open(ROOT / "data" / "logs" / f"{log}.json"))
    md += f"## {i+1}. {ref} L{lv} {log}\n\nPlanted:\n" + "".join(f"- {f['id']} ({f['typeName']}): " + " / ".join(f["plantedLines"]) + "\n" for f in man["facts"])
    md += "\nOutput:\n```\n" + rec["observations"] + "\n```\n\n"
(ROOT / "hand-check" / "sample.md").write_text(md)
json.dump([list(k) for k in sample], open(ROOT / "hand-check" / "sample.json", "w"))
print(len(sample), "outputs")
