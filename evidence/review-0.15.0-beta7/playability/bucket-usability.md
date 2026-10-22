# Lava bucket allocation usability

All six allocated maps have a useful **first-shot lava bucket route** from the authored initial scene. No preparation shots are required. Each route consumes its one configured bucket and leaves every other ammunition supply untouched.

Verification uses the actual Matter simulation, `buildLevel`, `inventoryFor`, `spendAmmo`, and `pullSling`, stepping at 120 Hz. Pointer coordinates use the same float rounding as the production browser route tests. There are no enemy relocations, fabricated contacts, extra supplies, or canonical route edits. A second replay verifies the saved shot plans without patching world methods.

| Map | Pointer x, y | Bucket kills within 10 s | HP removed | Longest lethal burn | Source rectangle x, y |
| --- | --- | --- | --- | --- | --- |
| Nether 4 | 150.026993, 547.699829 | 1 zombified piglin | 100 | 1.2 s | 828, 624 |
| Nether 7 | 153.253845, 574.460999 | 1 zombified piglin, 1 hoglin | 400 | 3.6 s | 900, 540 |
| Nether 9 | 150.242920, 553.095154 | 1 hoglin | 300 | 3.6 s | 972, 672 |
| End 4 | 150.674438, 558.477539 | 1 Shulker, 1 Enderman | 500 | 3.6 s | 840, 576 |
| End 6 | 150.674438, 558.477539 | 1 Enderman | 200 | 1.2 s | 840, 576 |
| Sift 6 | 219.002274, 648.000000 | 1 Blub | 100 | 1.2 s | 1392, 360 |

Every source has a 48 × 48 px footprint on the exposed side of the actual impact. Nether 7 seeds 12 clear fluid cells within that footprint because its impact surface clips one row; the other five routes seed 16. Nether 9 also latches a second piglin at 9.833 s, near the end of the 10 s observation window.

The source remains useful after the projectile disappears: Nether 4's piglin first touches the flow at 4.267 s and dies at 5.467 s. Endermen preserve their existing special damage and teleport rules, accounting for the shorter lethal burn.

Detailed shot plans, HP tick logs, and source seed geometry are in `bucket-use-<world>-<level>.json`. The independent replay results and exact production source hashes are in `bucket-usability-verification.json`. These are partial usability routes, not complete campaign victories.

The final per-step touch-detection replay is in bucket-usability-verification.json and each fixture's finalReplay field. Earlier discovery traces are retained as discovery evidence.
