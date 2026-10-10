import { describe, expect, it } from 'vitest';

import { checkFact } from './fact-check';
import { LEVELS, REFS, loadLogs, providerFromEnv, reflectOnce } from './harness';
import type { RefName } from './harness';

/**
 * Real-model eval of how many planted facts survive Observational Memory's Reflector at each
 * compression level, on two refs of mastra-ai/mastra. Written in the style of
 * packages/memory/.../__tests__/subconscious-curate-noise.eval.test.ts. It calls a live provider,
 * so it only runs when opted in: `RUN_REFLECTOR_EVAL=1` with `GEMINI_API_KEY` (default model, the
 * Reflector's default google/gemini-2.5-flash) or `RFS_PROVIDER=groq` with `GROQ_API_KEY`.
 * Replies are cached in raw/, so reruns only call the model for missing cells.
 */
const provider = providerFromEnv();
const runEval =
  process.env.RUN_REFLECTOR_EVAL === '1' &&
  !!(provider.name === 'google' ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY);

const logs = loadLogs();

describe.skipIf(!runEval)('Reflector fact survival (live model)', () => {
  for (const ref of Object.keys(REFS) as RefName[]) {
    for (const level of LEVELS) {
      it(`${ref} level ${level}: reports surviving planted facts`, async () => {
        let kept = 0, total = 0;
        for (const log of logs) {
          const rec = await reflectOnce({ provider, ref, level, log });
          expect(rec.observations.length, `${log.id} produced no observations`).toBeGreaterThan(0);
          for (const fact of log.manifest.facts) {
            if (fact.type === 18) continue; // control, reported separately
            total++;
            if (checkFact(rec.observations, fact.check).pass) kept++;
          }
        }
        console.info(`${ref} L${level}: ${kept}/${total} planted facts survived (${provider.model})`);
        // Report-only: survival is a measurement, not a pass/fail gate.
        expect(total).toBe(logs.length * 3 - 3);
      }, 3_600_000);
    }
  }
});
