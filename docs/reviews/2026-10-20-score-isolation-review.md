# Independent score isolation review — 2026-10-20

Reviewed `scripts/leaderboard.cjs`, `scripts/serve.cjs`, `src/online.mjs`,
`src/toy-online.mjs`, `src/toy-storage.mjs` and `src/dimensions.mjs` independently
from their implementation. No score code was edited by this reviewer.

## Findings and disposition

- P2, addressed: the overworld leaderboard initially bypassed the health and
  `scoreSeason` capability check. A new frontend could therefore display old
  server rows despite rejecting old profile times and submissions. The bypass
  was removed by the score implementer; all three worlds now use the check.
- Deployment prerequisite, not a current code blocker: the Toy SDK retains
  maximum scores, and the adapter intentionally retains the original valid
  time encoding. Reusing the old Toy ID and board 1 would retain old scores.
  A controlled SDK reproduction returned the old 10-second score and made no
  submission for a new 20-second clear. The user's release decision is to
  create a new Toy work with a new ID and three initially empty boards. Do not
  deploy this package over the old Toy ID; do not fake a score encoding reset.
  Review the new preview before a formal Toy submission. Removing the old
  work requires the supported platform interface; this review does not claim
  that deletion or creation has happened.

No additional concrete P1/P2 issues were found in the reviewed migration and
isolation paths: v1/v2/v3 scores are archived before the v4 atomic rename;
the backup is written and synced before an atomic non-replacing hard link;
old-season API submissions are rejected; world queries choose separate stage
maps; native Toy submissions and cache revisions are maintained per board;
cloud v1 contributes only overworld progress, while new times use v2 keys.

This review did not run another full suite while map replay search was active.
The two findings were verified with narrow, controlled client reproductions.
