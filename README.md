# Mastra Reflector fact-survival benchmark

Mastra's Observational Memory has a Reflector that rewrites old observations into a shorter log when memory gets long. Anything it drops, the agent no longer knows. This is a small, opt-in check of which planted facts survive the Reflector at compression levels 1 to 4, on `main` and on [PR #26465](https://github.com/mastra-ai/mastra/pull/26465) (open, head `3781dc94`), where a benchmark run was asked for before rewording the level-1 guidance. 82 s video (voiced): https://mastra-reflector-fact-survival.onrender.com/demo.mp4

**Setup.** 18 synthetic memory logs in OM format (about 2.5k tokens each), 3 planted facts per log, 18 fact types x 3 ([data/logs](data/logs)). Mastra's own Reflector prompt code (system prompt, compression guidance, parser) is bundled unmodified from each ref ([vendor](vendor), [scripts/build-refs.sh](scripts/build-refs.sh)). One call per log, level and ref, temperature 0. Survival is scored by code only, no LLM judge ([src/fact-check.ts](src/fact-check.ts)).

**Results, gemini-3.5-flash-lite, all 144 calls** (planted facts kept, out of 51; control noise excluded)

| Level | main | PR #26465 | output / input tokens (main / PR) |
|---|---|---|---|
| 1 | 43 | 46 | 0.30 / 0.34 |
| 2 | 42 | 45 | 0.23 / 0.27 |
| 3 | 42 | 43 | 0.18 / 0.19 |
| 4 | 44 | 44 | 0.17 / 0.20 |

Lost on both refs at almost every level: who suggested what (an assistant suggestion becomes "user agreed"), undecided assistant suggestions, a 7h40 layover, "doesn't know their credit score", an app version. Most main vs PR differences are "changed value, keep old and new" facts (n = 3 per type, one seed, so treat them as hints). Full tables: [results/gemini-3.5-flash-lite/results.md](results/gemini-3.5-flash-lite/results.md).

**Default Reflector model (gemini-2.5-flash), partial.** Its free tier allows 20 requests a day, so only level 4 on logs 0 to 8 ran (17 calls): main 24/26, PR 22/23. [results/gemini-2.5-flash](results/gemini-2.5-flash). Rerunning `npm run eval` resumes from the cached calls in [raw](raw).

**Checker accuracy.** 20 outputs (10 with a checker miss, 10 without), 60 facts read in full, blind to the checker: 1 false miss, 0 false hits (98.3%). The reader was the agent that built this, not an independent human. Known weakness: the preference qualifier list contains "use", which also matches "User". See [hand-check](hand-check).

**Run it.** `npm i && npm test` (checker unit tests). `GEMINI_API_KEY=... RFS_MODEL=gemini-3.5-flash-lite npm run eval`, then `RFS_MODEL=... npm run report`. Logs: `GROQ_API_KEY=... python3 scripts/generate_logs.py` (filler written by Groq gpt-oss models and gemini-3.5-flash-lite, planted lines hand-written, 4 hand edits in [data/filler_edits.json](data/filler_edits.json)).

**Limits.** Small logs (production reflection runs near 40k tokens), one seed, 3 facts per type, the Reflector prompt called directly through the Gemini API rather than through Mastra's Agent, a fallback model for the full grid. A measurement to help the level-1 follow-up, not a verdict on either ref.

Built on [Mastra](https://github.com/mastra-ai/mastra) (Apache-2.0, Copyright 2025 Kepler Software, Inc.; see [LICENSE-MASTRA](LICENSE-MASTRA)). Not affiliated with Mastra. This repo: Apache-2.0. The eval file follows the style of Mastra's `subconscious-curate-noise.eval.test.ts`; skills adapted from ai-evals-course/evals-skills (Apache-2.0).
