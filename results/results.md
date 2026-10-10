# Results

Model: google:gemini-2.5-flash. Refs: main faf79ea0, PR #26465 head 3781dc94.

**Partial:** 7 of 8 calls missing.

## Planted facts kept (51 facts, 3 per type, control excluded)

| Level | main | PR #26465 | noise dropped main | noise dropped PR | output/input tokens main | output/input tokens PR |
|---|---|---|---|---|---|---|
| 1 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 2 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 3 | 0/0 (n/a) | 0/0 (n/a) | 0/0 | 0/0 | - | - |
| 4 | 3/3 (100%) | 0/0 (n/a) | 0/0 | 0/0 | 0.59 | - |

## By fact type (kept/3)

| Fact type | main L1 | main L2 | main L3 | main L4 | PR L1 | PR L2 | PR L3 | PR L4 |
|---|---|---|---|---|---|---|---|---|
| 1. person name in a low-priority line | - | - | - | 1/1 | - | - | - | - |
| 2. 2 | - | - | - | - | - | - | - | - |
| 3. 3 | - | - | - | - | - | - | - | - |
| 4. 4 | - | - | - | - | - | - | - | - |
| 5. 5 | - | - | - | - | - | - | - | - |
| 6. 6 | - | - | - | - | - | - | - | - |
| 7. place | - | - | - | 1/1 | - | - | - | - |
| 8. 8 | - | - | - | - | - | - | - | - |
| 9. 9 | - | - | - | - | - | - | - | - |
| 10. 10 | - | - | - | - | - | - | - | - |
| 11. 11 | - | - | - | - | - | - | - | - |
| 12. 12 | - | - | - | - | - | - | - | - |
| 13. stated preference | - | - | - | 1/1 | - | - | - | - |
| 14. 14 | - | - | - | - | - | - | - | - |
| 15. 15 | - | - | - | - | - | - | - | - |
| 16. 16 | - | - | - | - | - | - | - | - |
| 17. 17 | - | - | - | - | - | - | - | - |
| 18. 18 | - | - | - | - | - | - | - | - |

## By position in the log (kept/17)

| Position | main L1 | main L2 | main L3 | main L4 | PR L1 | PR L2 | PR L3 | PR L4 |
|---|---|---|---|---|---|---|---|---|
| early | - | - | - | 1/1 | - | - | - | - |
| middle | - | - | - | 1/1 | - | - | - | - |
| late | - | - | - | 1/1 | - | - | - | - |

## Facts the check marked lost

| Ref | Level | Fact | Type | Check reason |
|---|---|---|---|---|

## Main vs PR disagreements (same log, same level)

| Level | Fact | Type | main | PR |
|---|---|---|---|---|
