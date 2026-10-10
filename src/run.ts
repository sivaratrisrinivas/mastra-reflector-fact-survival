import { providerFromEnv, runAll } from './harness';

const provider = providerFromEnv();
console.log(`provider=${provider.name} model=${provider.model}`);
const r = await runAll({ provider, gapMs: Number(process.env.RFS_GAP_MS ?? 7000), onProgress: s => console.log(s) });
console.log(JSON.stringify(r));
