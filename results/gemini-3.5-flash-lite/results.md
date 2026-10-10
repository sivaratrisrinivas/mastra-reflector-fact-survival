# Results

Model: google:gemini-3.5-flash-lite. Refs: main faf79ea0, PR #26465 head 3781dc94.

**Partial:** 132 of 144 calls missing.

## Planted facts kept (51 facts, 3 per type, control excluded)

| Level | main | PR #26465 | noise dropped main | noise dropped PR | output/input tokens main | output/input tokens PR |
|---|---|---|---|---|---|---|
| 1 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 2 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 3 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 4 | 14/17 (82%) | 13/17 (76%) | 1/1 | 0/1 | 0.16 | 0.18 |

## By fact type (kept/3)

| Fact type | main L1 | main L2 | main L3 | main L4 | PR L1 | PR L2 | PR L3 | PR L4 |
|---|---|---|---|---|---|---|---|---|
| 1. person name in a low-priority line | - | - | - | 1/1 | - | - | - | 1/1 |
| 2. dollar amount | - | - | - | 1/1 | - | - | - | 1/1 |
| 3. absolute date | - | - | - | 1/1 | - | - | - | 1/1 |
| 4. relative date with anchor | - | - | - | 1/1 | - | - | - | 1/1 |
| 5. version string | - | - | - | 0/1 | - | - | - | 0/1 |
| 6. duration | - | - | - | 0/1 | - | - | - | 0/1 |
| 7. place | - | - | - | 1/1 | - | - | - | 1/1 |
| 8. changed value: old and new both kept | - | - | - | 1/1 | - | - | - | 0/1 |
| 9. changed value: new marked current | - | - | - | 1/1 | - | - | - | 1/1 |
| 10. stated negative (never) | - | - | - | 1/1 | - | - | - | 1/1 |
| 11. doesn't know X | - | - | - | 1/1 | - | - | - | 1/1 |
| 12. refused action | - | - | - | 1/1 | - | - | - | 1/1 |
| 13. stated preference | - | - | - | 1/1 | - | - | - | 1/1 |
| 14. standing instruction / rule | - | - | - | 1/1 | - | - | - | 1/1 |
| 15. who-said-what (assistant attribution) | - | - | - | 0/1 | - | - | - | 0/1 |
| 16. fact repeated 3 times | - | - | - | 1/1 | - | - | - | 1/1 |
| 17. fact buried in a long tool-result line | - | - | - | 1/1 | - | - | - | 1/1 |
| 18. control: transient noise (pass = absent) | - | - | - | 1/1 | - | - | - | 0/1 |

## By position in the log (kept/17)

| Position | main L1 | main L2 | main L3 | main L4 | PR L1 | PR L2 | PR L3 | PR L4 |
|---|---|---|---|---|---|---|---|---|
| early | - | - | - | 4/6 | - | - | - | 4/6 |
| middle | - | - | - | 6/6 | - | - | - | 5/6 |
| late | - | - | - | 4/5 | - | - | - | 4/5 |

## Facts the check marked lost

| Ref | Level | Fact | Type | Check reason |
|---|---|---|---|---|
| main | 4 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* ✅ (18:20) Added QR code payment receipts, Redis Streams, Snyk security scans, and merged Stripe integration into main." |
| main | 4 | log04-f0 | version string | missing any of [4.9.2] |
| main | 4 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| pr26465 | 4 | log01-f1 | changed value: old and new both kept | missing any of [04/23/2026 / 2026-04-23 / 23 apr / 23 april] |
| pr26465 | 4 | log02-f2 | who-said-what (assistant attribution) | fact present but qualifier missing on its line: "* ✅ (20:05) Deployed Stripe webhooks, QR code email receipts, Snyk security scanning, agreed on Redis Streams for background jobs, and merge" |
| pr26465 | 4 | log04-f0 | version string | missing any of [4.9.2] |
| pr26465 | 4 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |

## Main vs PR disagreements (same log, same level)

| Level | Fact | Type | main | PR |
|---|---|---|---|---|
| 4 | log01-f1 | changed value: old and new both kept | kept | lost |
| 4 | log05-f2 | control: transient noise (pass = absent) | kept | lost |
