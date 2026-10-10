# Results

Model: google:gemini-3.5-flash-lite. Refs: main faf79ea0, PR #26465 head 3781dc94.

All 144 calls complete.

## Planted facts kept (51 facts, 3 per type, control excluded)

| Level | main | PR #26465 | noise dropped main | noise dropped PR | output/input tokens main | output/input tokens PR |
|---|---|---|---|---|---|---|
| 1 | 43/51 (84%) | 46/51 (90%) | 2/3 | 2/3 | 0.3 | 0.34 |
| 2 | 42/51 (82%) | 45/51 (88%) | 2/3 | 2/3 | 0.23 | 0.27 |
| 3 | 42/51 (82%) | 43/51 (84%) | 2/3 | 2/3 | 0.18 | 0.19 |
| 4 | 44/51 (86%) | 44/51 (86%) | 3/3 | 2/3 | 0.17 | 0.2 |

## By fact type (kept/3)

| Fact type | main L1 | main L2 | main L3 | main L4 | PR L1 | PR L2 | PR L3 | PR L4 |
|---|---|---|---|---|---|---|---|---|
| 1. person name in a low-priority line | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 2. dollar amount | 2/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 3. absolute date | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 4. relative date with anchor | 3/3 | 3/3 | 2/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 5. version string | 3/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 |
| 6. duration | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 |
| 7. place | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 8. changed value: old and new both kept | 2/3 | 1/3 | 1/3 | 3/3 | 3/3 | 3/3 | 2/3 | 2/3 |
| 9. changed value: new marked current | 3/3 | 2/3 | 3/3 | 2/3 | 3/3 | 3/3 | 3/3 | 2/3 |
| 10. stated negative (never) | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 11. doesn't know X | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 | 2/3 |
| 12. refused action | 2/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 13. stated preference | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 2/3 | 3/3 |
| 14. standing instruction / rule | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 15. who-said-what (assistant attribution) | 0/3 | 0/3 | 0/3 | 0/3 | 1/3 | 0/3 | 0/3 | 1/3 |
| 16. fact repeated 3 times | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 17. fact buried in a long tool-result line | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 18. control: transient noise (pass = absent) | 2/3 | 2/3 | 2/3 | 3/3 | 2/3 | 2/3 | 2/3 | 2/3 |

## By position in the log (kept/17)

| Position | main L1 | main L2 | main L3 | main L4 | PR L1 | PR L2 | PR L3 | PR L4 |
|---|---|---|---|---|---|---|---|---|
| early | 13/17 | 11/17 | 11/17 | 12/17 | 13/17 | 13/17 | 11/17 | 14/17 |
| middle | 15/17 | 15/17 | 15/17 | 16/17 | 16/17 | 16/17 | 16/17 | 15/17 |
| late | 15/17 | 16/17 | 16/17 | 16/17 | 17/17 | 16/17 | 16/17 | 15/17 |

## Facts the check marked lost

| Ref | Level | Fact | Type | Check reason |
|---|---|---|---|---|
| main | 1 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* 🟡 (16:30) User agreed to use Redis Streams for the background job queue." |
| main | 1 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| main | 1 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| main | 1 | log10-f0 | doesn't know X | missing any of [credit score] |
| main | 1 | log11-f0 | refused action | missing any of [credential / login / password] |
| main | 1 | log13-f1 | dollar amount | missing any of [4750 / 4.75k] |
| main | 1 | log13-f2 | changed value: old and new both kept | missing any of [140] |
| main | 1 | log14-f0 | who-said-what (assistant attribution) | missing any of [quartet] |
| main | 2 | log01-f1 | changed value: old and new both kept | missing any of [04/23/2026 / 2026-04-23 / 23 apr / 23 april] |
| main | 2 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* 🟡 (15:40) Added nightly DB cleanup cron job and adopted Redis Streams for background job queue (user agreed)." |
| main | 2 | log04-f0 | version string | missing any of [4.9.2] |
| main | 2 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| main | 2 | log07-f0 | changed value: old and new both kept | missing any of [18400 / 18.4k] |
| main | 2 | log08-f0 | changed value: new marked current | old and new both present, new not marked current |
| main | 2 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| main | 2 | log10-f0 | doesn't know X | missing any of [credit score] |
| main | 2 | log14-f0 | who-said-what (assistant attribution) | missing any of [quartet] |
| main | 3 | log01-f1 | changed value: old and new both kept | missing any of [04/23/2026 / 2026-04-23 / 23 apr / 23 april] |
| main | 3 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* 🟡 Added nightly DB cleanup script, Snyk security scanning in CI, and evaluated Redis Streams for background jobs." |
| main | 3 | log03-f0 | relative date with anchor | missing any of [04/03/2026 / 2026-04-03 / 3 apr / 3 april] |
| main | 3 | log04-f0 | version string | missing any of [4.9.2] |
| main | 3 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| main | 3 | log07-f0 | changed value: old and new both kept | missing any of [18400 / 18.4k] |
| main | 3 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| main | 3 | log10-f0 | doesn't know X | missing any of [credit score] |
| main | 3 | log14-f0 | who-said-what (assistant attribution) | missing any of [quartet] |
| main | 4 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* ✅ (18:20) Added QR code payment receipts, Redis Streams, Snyk security scans, and merged Stripe integration into main." |
| main | 4 | log04-f0 | version string | missing any of [4.9.2] |
| main | 4 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| main | 4 | log08-f0 | changed value: new marked current | old and new both present, new not marked current |
| main | 4 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| main | 4 | log10-f0 | doesn't know X | missing any of [credit score] |
| main | 4 | log14-f0 | who-said-what (assistant attribution) | missing any of [quartet] |
| pr26465 | 1 | log04-f0 | version string | missing any of [4.9.2] |
| pr26465 | 1 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| pr26465 | 1 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| pr26465 | 1 | log10-f0 | doesn't know X | missing any of [credit score] |
| pr26465 | 1 | log14-f0 | who-said-what (assistant attribution) | missing any of [quartet] |
| pr26465 | 2 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* 🟡 (15:40) Added nightly DB cleanup cron, Redis Streams for background jobs, and Snyk security scans in CI." |
| pr26465 | 2 | log04-f0 | version string | missing any of [4.9.2] |
| pr26465 | 2 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| pr26465 | 2 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| pr26465 | 2 | log10-f0 | doesn't know X | missing any of [credit score] |
| pr26465 | 2 | log14-f0 | who-said-what (assistant attribution) | missing any of [quartet] |
| pr26465 | 3 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* 🟡 (16:30) Adopted Redis Streams for background job queues and added Snyk security scanning to CI." |
| pr26465 | 3 | log04-f0 | version string | missing any of [4.9.2] |
| pr26465 | 3 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| pr26465 | 3 | log07-f0 | changed value: old and new both kept | missing any of [18400 / 18.4k] |
| pr26465 | 3 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| pr26465 | 3 | log10-f0 | doesn't know X | missing any of [credit score] |
| pr26465 | 3 | log12-f0 | stated preference | fact present but qualifier missing on its line: "* 🔴 Wedding planning details established: Outdoors hilltop ceremony (sunset view, garden pavilion, 14:00 start), vintage reception decor, b" |
| pr26465 | 3 | log14-f0 | who-said-what (assistant attribution) | missing any of [quartet] |
| pr26465 | 4 | log01-f1 | changed value: old and new both kept | missing any of [04/23/2026 / 2026-04-23 / 23 apr / 23 april] |
| pr26465 | 4 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* ✅ (20:05) Deployed Stripe webhooks, QR code email receipts, Snyk security scanning, agreed on Redis Streams for background jobs, and merge" |
| pr26465 | 4 | log04-f0 | version string | missing any of [4.9.2] |
| pr26465 | 4 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| pr26465 | 4 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| pr26465 | 4 | log10-f0 | doesn't know X | missing any of [credit score] |
| pr26465 | 4 | log14-f2 | changed value: new marked current | old and new both present, new not marked current |

## Main vs PR disagreements (same log, same level)

| Level | Fact | Type | main | PR |
|---|---|---|---|---|
| 1 | log02-f2 | who-said-what (assistant attribution) | lost | kept |
| 1 | log04-f0 | version string | kept | lost |
| 1 | log11-f0 | refused action | lost | kept |
| 1 | log13-f1 | dollar amount | lost | kept |
| 1 | log13-f2 | changed value: old and new both kept | lost | kept |
| 2 | log01-f1 | changed value: old and new both kept | lost | kept |
| 2 | log07-f0 | changed value: old and new both kept | lost | kept |
| 2 | log08-f0 | changed value: new marked current | lost | kept |
| 3 | log01-f1 | changed value: old and new both kept | lost | kept |
| 3 | log03-f0 | relative date with anchor | lost | kept |
| 3 | log12-f0 | stated preference | kept | lost |
| 4 | log01-f1 | changed value: old and new both kept | kept | lost |
| 4 | log05-f2 | control: transient noise (pass = absent) | kept | lost |
| 4 | log08-f0 | changed value: new marked current | lost | kept |
| 4 | log14-f0 | who-said-what (assistant attribution) | lost | kept |
| 4 | log14-f2 | changed value: new marked current | kept | lost |
