/** Scores every saved Reflector reply with the code check and writes results/. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { estimateTokenCount } from 'tokenx';

import { checkFact } from './fact-check';
import { LEVELS, REFS, ROOT, loadLogs, providerFromEnv, rawPath } from './harness';
import type { RefName } from './harness';

const provider = providerFromEnv();
const logs = loadLogs();
const refs = Object.keys(REFS) as RefName[];
type Row = {
  ref: RefName; level: number; log: string; fact: string; type: number; typeName: string; position: string;
  pass: boolean; reason: string; modelVersion: string;
};
const rows: Row[] = [];
const ratio: Record<string, number[]> = {};
const models = new Set<string>();
const missing: string[] = [];

for (const ref of refs) for (const level of LEVELS) for (const log of logs) {
  const p = rawPath(provider, ref, level, log.id);
  if (!existsSync(p)) { missing.push(`${ref}/L${level}/${log.id}`); continue; }
  const rec = JSON.parse(readFileSync(p, 'utf8'));
  models.add(`${rec.provider}:${rec.modelVersion}`);
  (ratio[`${ref}|${level}`] ??= []).push(estimateTokenCount(rec.observations) / estimateTokenCount(log.text));
  for (const f of log.manifest.facts) {
    const r = checkFact(rec.observations, f.check);
    rows.push({ ref, level, log: log.id, fact: f.id, type: f.type, typeName: f.typeName, position: f.position,
      pass: r.pass, reason: r.reason, modelVersion: rec.modelVersion });
  }
}

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : 'n/a');
const cell = (rs: Row[]) => { const k = rs.filter(r => r.pass).length; return { kept: k, n: rs.length }; };
const facts = rows.filter(r => r.type !== 18);
const control = rows.filter(r => r.type === 18);

const summary = refs.flatMap(ref => LEVELS.map(level => {
  const f = cell(facts.filter(r => r.ref === ref && r.level === level));
  const c = cell(control.filter(r => r.ref === ref && r.level === level));
  const rs = ratio[`${ref}|${level}`] ?? [];
  return { ref, level, factsKept: f.kept, factsTotal: f.n, logsRun: rs.length, noiseDropped: c.kept, noiseTotal: c.n,
    meanOutputToInputTokens: rs.length ? +(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(2) : null };
}));

const byType: Record<string, Record<string, string>> = {};
for (let t = 1; t <= 18; t++) {
  const name = rows.find(r => r.type === t)?.typeName ?? String(t);
  byType[`${t}. ${name}`] = {};
  for (const ref of refs) for (const level of LEVELS) {
    const c = cell(rows.filter(r => r.type === t && r.ref === ref && r.level === level));
    byType[`${t}. ${name}`][`${ref} L${level}`] = c.n ? `${c.kept}/${c.n}` : '-';
  }
}
const byPosition: Record<string, Record<string, string>> = {};
for (const pos of ['early', 'middle', 'late']) {
  byPosition[pos] = {};
  for (const ref of refs) for (const level of LEVELS) {
    const c = cell(facts.filter(r => r.position === pos && r.ref === ref && r.level === level));
    byPosition[pos][`${ref} L${level}`] = c.n ? `${c.kept}/${c.n}` : '-';
  }
}
const lost = facts.filter(r => !r.pass).map(r => ({ ref: r.ref, level: r.level, fact: r.fact, type: r.typeName, reason: r.reason }));
const disagreements = [] as any[];
for (const level of LEVELS) for (const log of logs) for (const f of log.manifest.facts) {
  const a = rows.find(r => r.ref === 'main' && r.level === level && r.fact === f.id);
  const b = rows.find(r => r.ref === 'pr26465' && r.level === level && r.fact === f.id);
  if (a && b && a.pass !== b.pass) disagreements.push({ level, fact: f.id, type: f.typeName, main: a.pass, pr26465: b.pass });
}

mkdirSync(join(ROOT, 'results'), { recursive: true });
const out = { provider: provider.name, modelRequested: provider.model, modelsSeen: [...models], refs: REFS,
  complete: missing.length === 0, missing, summary, byType, byPosition, lost, disagreements };
writeFileSync(join(ROOT, 'results', 'results.json'), JSON.stringify(out, null, 1));
writeFileSync(join(ROOT, 'results', 'per-fact.csv'),
  'ref,level,log,fact,type,typeName,position,pass,reason,modelVersion\n' +
  rows.map(r => [r.ref, r.level, r.log, r.fact, r.type, `"${r.typeName}"`, r.position, r.pass, `"${r.reason.replace(/"/g, "'")}"`, r.modelVersion].join(',')).join('\n') + '\n');

const head = (cols: string[]) => `| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|\n`;
let md = `# Results\n\nModel: ${[...models].join(', ') || provider.model}. Refs: main ${REFS.main.slice(0, 8)}, PR #26465 head ${REFS.pr26465.slice(0, 8)}.\n`;
md += missing.length ? `\n**Partial:** ${missing.length} of ${refs.length * LEVELS.length * logs.length} calls missing.\n` : '\nAll 144 calls complete.\n';
md += `\n## Planted facts kept (51 facts, 3 per type, control excluded)\n\n` + head(['Level', 'main', 'PR #26465', 'noise dropped main', 'noise dropped PR', 'output/input tokens main', 'output/input tokens PR']);
for (const level of LEVELS) {
  const a = summary.find(s => s.ref === 'main' && s.level === level)!;
  const b = summary.find(s => s.ref === 'pr26465' && s.level === level)!;
  md += `| ${level} | ${a.factsKept}/${a.factsTotal} (${pct(a.factsKept, a.factsTotal)}) | ${b.factsKept}/${b.factsTotal} (${pct(b.factsKept, b.factsTotal)}) | ${a.noiseDropped}/${a.noiseTotal} | ${b.noiseDropped}/${b.noiseTotal} | ${a.meanOutputToInputTokens ?? '-'} | ${b.meanOutputToInputTokens ?? '-'} |\n`;
}
const cols = refs.flatMap(r => LEVELS.map(l => `${r} L${l}`));
md += `\n## By fact type (kept/3)\n\n` + head(['Fact type', ...cols.map(c => c.replace('pr26465', 'PR'))]);
for (const [k, v] of Object.entries(byType)) md += `| ${k} | ${cols.map(c => v[c]).join(' | ')} |\n`;
md += `\n## By position in the log (kept/17)\n\n` + head(['Position', ...cols.map(c => c.replace('pr26465', 'PR'))]);
for (const [k, v] of Object.entries(byPosition)) md += `| ${k} | ${cols.map(c => v[c]).join(' | ')} |\n`;
md += `\n## Facts the check marked lost\n\n` + head(['Ref', 'Level', 'Fact', 'Type', 'Check reason']);
for (const l of lost) md += `| ${l.ref} | ${l.level} | ${l.fact} | ${l.type} | ${l.reason.replace(/\|/g, '/')} |\n`;
md += `\n## Main vs PR disagreements (same log, same level)\n\n` + head(['Level', 'Fact', 'Type', 'main', 'PR']);
for (const d of disagreements) md += `| ${d.level} | ${d.fact} | ${d.type} | ${d.main ? 'kept' : 'lost'} | ${d.pr26465 ? 'kept' : 'lost'} |\n`;
writeFileSync(join(ROOT, 'results', 'results.md'), md);
console.log(md.split('## By fact type')[0]);
