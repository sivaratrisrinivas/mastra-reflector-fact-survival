/**
 * Runs Mastra's Reflector prompt (system prompt, compression guidance, output parser) from a given
 * ref on each synthetic log at a given compression level, and saves the raw reply to raw/.
 * Results are checkpointed per call: a file that exists is never re-requested, so a run that hits
 * a free-tier limit can be resumed later and partial results stay usable.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const REFS = {
  main: 'faf79ea0d1aa7b2265b070f5323339fa275ebb49',
  pr26465: '3781dc946a8545cd3548887496d54beb0f64c67d',
} as const;
export type RefName = keyof typeof REFS;
export const LEVELS = [1, 2, 3, 4] as const;

export type LogManifest = {
  id: string;
  domain: string;
  facts: { id: string; type: number; typeName: string; position: string; plantedLines: string[]; check: any }[];
};

export function loadLogs(): { id: string; text: string; manifest: LogManifest }[] {
  const dir = join(ROOT, 'data', 'logs');
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => {
      const id = f.replace('.md', '');
      return {
        id,
        text: readFileSync(join(dir, f), 'utf8'),
        manifest: JSON.parse(readFileSync(join(dir, `${id}.json`), 'utf8')),
      };
    });
}

export async function loadRef(ref: RefName) {
  return import(join(ROOT, 'vendor', `reflector-${ref}.mjs`));
}

export type Provider = { name: 'google' | 'groq'; model: string };

export function providerFromEnv(): Provider {
  const name = (process.env.RFS_PROVIDER ?? 'google') as Provider['name'];
  const model = process.env.RFS_MODEL ?? (name === 'google' ? 'gemini-2.5-flash' : 'openai/gpt-oss-120b');
  return { name, model };
}

export class QuotaExhausted extends Error {}

type CallResult = { text: string; modelVersion: string; usage: unknown; finishReason: string };

async function callGoogle(model: string, system: string, user: string): Promise<CallResult> {
  // Mirrors Mastra's reflection defaults: temperature 0, thinkingBudget 1024 (constants.ts).
  // maxOutputTokens is 65536, the Gemini 2.5 Flash ceiling (Mastra asks for 100k).
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 65536, thinkingConfig: { thinkingBudget: 1024 } },
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY ?? '' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(240_000),
  });
  const json: any = await res.json();
  if (res.status === 429) {
    const txt = JSON.stringify(json);
    const perDay = /PerDay/i.test(txt);
    const retry = Number((txt.match(/"retryDelay":"(\d+)s"/) ?? [])[1] ?? 30);
    const err: any = perDay ? new QuotaExhausted(`daily quota: ${json?.error?.message?.slice(0, 200)}`) : new Error('rate');
    err.retry = retry;
    throw err;
  }
  if (!res.ok) throw new Error(`google ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts ?? []).filter((p: any) => !p.thought).map((p: any) => p.text ?? '').join('');
  return { text, modelVersion: json.modelVersion, usage: json.usageMetadata, finishReason: cand?.finishReason };
}

async function callGroq(model: string, system: string, user: string): Promise<CallResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY ?? ''}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(240_000),
  });
  const json: any = await res.json();
  if (res.status === 429) {
    const msg = json?.error?.message ?? '';
    const err: any = /per day|TPD|RPD/i.test(msg) ? new QuotaExhausted(`daily quota: ${msg.slice(0, 200)}`) : new Error('rate');
    err.retry = Number((msg.match(/try again in ([\d.]+)s/) ?? [])[1] ?? 20);
    throw err;
  }
  if (!res.ok) throw new Error(`groq ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return {
    text: json.choices[0].message.content,
    modelVersion: json.model,
    usage: json.usage,
    finishReason: json.choices[0].finish_reason,
  };
}

export function rawPath(provider: Provider, ref: RefName, level: number, logId: string) {
  const safe = provider.model.replace(/[^a-z0-9.-]/gi, '_');
  return join(ROOT, 'raw', safe, ref, `L${level}`, `${logId}.json`);
}

export async function reflectOnce(opts: {
  provider: Provider;
  ref: RefName;
  level: number;
  log: { id: string; text: string };
}) {
  const { provider, ref, level, log } = opts;
  const out = rawPath(provider, ref, level, log.id);
  if (existsSync(out)) return JSON.parse(readFileSync(out, 'utf8'));
  const m = await loadRef(ref);
  // Same composition the runtime uses: default reflection extractors (current-task, suggested-response).
  const extractors = m.composeReflectionExtractors({});
  const system = m.buildReflectorSystemPrompt(undefined, extractors);
  const user = m.buildReflectorPrompt(log.text, undefined, level, false, extractors, undefined);
  const call = provider.name === 'google' ? callGoogle : callGroq;
  for (let attempt = 0; ; attempt++) {
    const started = Date.now();
    try {
      const r = await call(provider.model, system, user);
      if (!r.text.trim() && attempt < 2) continue;
      const parsed = m.parseReflectorOutput(r.text, log.text, extractors);
      const rec = {
        ref,
        refSha: REFS[ref],
        level,
        log: log.id,
        provider: provider.name,
        modelRequested: provider.model,
        modelVersion: r.modelVersion,
        settings: provider.name === 'google' ? { temperature: 0, thinkingBudget: 1024, maxOutputTokens: 65536 } : { temperature: 0 },
        finishReason: r.finishReason,
        usage: r.usage,
        latencyMs: Date.now() - started,
        at: new Date().toISOString(),
        rawText: r.text,
        observations: parsed.observations,
        degenerate: !!parsed.degenerate,
      };
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify(rec, null, 1));
      return rec;
    } catch (e: any) {
      if (e instanceof QuotaExhausted) throw e;
      if (attempt >= 6) throw e;
      const wait = (e.retry ?? 15) * 1000 + 2000;
      console.warn(`[${ref} L${level} ${log.id}] ${e.message}; waiting ${wait / 1000}s`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

/** Level 4 first (the headline), then 1, 3, 2. Main and PR run back to back for each log. */
export const RUN_ORDER = [4, 1, 3, 2];

export async function runAll(opts: { provider: Provider; gapMs?: number; onProgress?: (s: string) => void }) {
  const logs = loadLogs();
  let done = 0, made = 0;
  const total = RUN_ORDER.length * logs.length * 2;
  try {
    for (const level of RUN_ORDER) {
      for (const log of logs) {
        for (const ref of Object.keys(REFS) as RefName[]) {
          const existed = existsSync(rawPath(opts.provider, ref, level, log.id));
          await reflectOnce({ provider: opts.provider, ref, level, log });
          done++;
          if (!existed) {
            made++;
            opts.onProgress?.(`${done}/${total} ${ref} L${level} ${log.id}`);
            await new Promise(r => setTimeout(r, opts.gapMs ?? 7000));
          }
        }
      }
    }
    return { complete: true, done, total, made };
  } catch (e: any) {
    if (e instanceof QuotaExhausted) return { complete: false, done, total, made, stoppedBy: e.message };
    throw e;
  }
}
