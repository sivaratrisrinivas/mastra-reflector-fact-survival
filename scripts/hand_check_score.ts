// Compares hand labels with the code check on the same outputs. Writes hand-check/summary.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkFact } from '../src/fact-check';
import { ROOT, loadLogs, rawPath, providerFromEnv } from '../src/harness';

const provider = providerFromEnv();
const labels = JSON.parse(readFileSync(join(ROOT, 'hand-check', 'labels.json'), 'utf8')).labels;
const logs = Object.fromEntries(loadLogs().map(l => [l.id, l]));
let n = 0, falseMiss = 0, falseHit = 0;
const disagreements: any[] = [];
for (const [key, labs] of Object.entries<number[]>(labels)) {
  const [ref, level, logId] = key.split('|');
  const rec = JSON.parse(readFileSync(rawPath(provider, ref as any, Number(level), logId), 'utf8'));
  logs[logId].manifest.facts.forEach((f, i) => {
    n++;
    const code = checkFact(rec.observations, f.check);
    const hand = labs[i] === 1;
    if (code.pass !== hand) {
      if (!code.pass && hand) falseMiss++; else falseHit++;
      disagreements.push({ output: key, fact: f.id, type: f.typeName, hand: hand ? 'kept' : 'lost', code: code.pass ? 'kept' : 'lost', reason: code.reason });
    }
  });
}
const summary = { model: provider.model, outputs: Object.keys(labels).length, judgments: n, falseMisses: falseMiss, falseHits: falseHit,
  agreementPct: Math.round((1000 * (n - falseMiss - falseHit)) / n) / 10, disagreements };
writeFileSync(join(ROOT, 'hand-check', 'summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
