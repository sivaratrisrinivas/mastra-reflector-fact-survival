# Results

Model: google:gemini-2.5-flash. Refs: main faf79ea0, PR #26465 head 3781dc94.

**Partial:** 127 of 144 calls missing.

## Planted facts kept (51 facts, 3 per type, control excluded)

| Level | main | PR #26465 | noise dropped main | noise dropped PR | output/input tokens main | output/input tokens PR |
|---|---|---|---|---|---|---|
| 1 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 2 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 3 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 4 | 24/26 (92%) | 22/23 (96%) | 1/1 | 0/1 | 0.61 | 0.65 |

## By fact type (kept/3)

| Fact type | main L1 | main L2 | main L3 | main L4 | PR L1 | PR L2 | PR L3 | PR L4 |
|---|---|---|---|---|---|---|---|---|
| 1. person name in a low-priority line | - | - | - | 2/2 | - | - | - | 2/2 |
| 2. dollar amount | - | - | - | 2/2 | - | - | - | 2/2 |
| 3. absolute date | - | - | - | 2/2 | - | - | - | 1/1 |
| 4. relative date with anchor | - | - | - | 1/1 | - | - | - | 1/1 |
| 5. version string | - | - | - | 1/1 | - | - | - | 1/1 |
| 6. duration | - | - | - | 0/1 | - | - | - | 0/1 |
| 7. place | - | - | - | 2/2 | - | - | - | 2/2 |
| 8. changed value: old and new both kept | - | - | - | 2/2 | - | - | - | 2/2 |
| 9. changed value: new marked current | - | - | - | 2/2 | - | - | - | 1/1 |
| 10. stated negative (never) | - | - | - | 1/1 | - | - | - | 1/1 |
| 11. doesn't know X | - | - | - | 1/1 | - | - | - | 1/1 |
| 12. refused action | - | - | - | 1/1 | - | - | - | 1/1 |
| 13. stated preference | - | - | - | 2/2 | - | - | - | 2/2 |
| 14. standing instruction / rule | - | - | - | 2/2 | - | - | - | 2/2 |
| 15. who-said-what (assistant attribution) | - | - | - | 1/2 | - | - | - | 1/1 |
| 16. fact repeated 3 times | - | - | - | 1/1 | - | - | - | 1/1 |
| 17. fact buried in a long tool-result line | - | - | - | 1/1 | - | - | - | 1/1 |
| 18. control: transient noise (pass = absent) | - | - | - | 1/1 | - | - | - | 0/1 |

## By position in the log (kept/17)

| Position | main L1 | main L2 | main L3 | main L4 | PR L1 | PR L2 | PR L3 | PR L4 |
|---|---|---|---|---|---|---|---|---|
| early | - | - | - | 8/9 | - | - | - | 7/8 |
| middle | - | - | - | 8/9 | - | - | - | 8/8 |
| late | - | - | - | 8/8 | - | - | - | 7/7 |

## Facts the check marked lost

| Ref | Level | Fact | Type | Check reason |
|---|---|---|---|---|
| main | 4 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |
| main | 4 | log08-f1 | who-said-what (assistant attribution) | missing any of [dishwasher] |
| pr26465 | 4 | log05-f0 | duration | missing any of [7 hours 40 / 7h40 / 7h 40 / 7 hr 40] |

## Main vs PR disagreements (same log, same level)

| Level | Fact | Type | main | PR |
|---|---|---|---|---|
| 4 | log05-f2 | control: transient noise (pass = absent) | kept | lost |
