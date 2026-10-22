# Beta 6: one-block anvil impacts and independent Shulkers

## Gameplay

- An anvil impact cuts a 48 by 48 world-pixel footprint (16 by 16 material pixels). Its depth allowance ends at one block of continuous material; it stops and fades instead of drilling down through ground.
- Leaving a floor into air releases the carving state and restores natural gravity. A fresh physical contact on the next floor grants another one-block impact. Even one material pixel of air is treated as a gap.
- Actual Matter fixtures remove exactly 256 material pixels on continuous ground and 768 across three separated floors. Additional cases cover pitched roofs, moving debris, old sensor pairs, tiny gaps, protected surfaces, head rests, teleports and the approved flight range.
- Existing ordinary full-pull stones already remove roughly half a block on strong roof impacts; their damage is unchanged. Measurements and renderer comparisons are in impact-qa/.
- Every Shulker now has an avalanche-hashed, actor-local random stream. The previous linear seeds clustered first openings only 39 ms apart. Opening/closing sounds identify only the actor that changed state; freezing one actor leaves sibling schedules unchanged. Enderman random choices are unchanged.
- Updated six End routes and Sift 4's route using their existing finite inventories. No map or supply inflation. Formal progress, score season and board mappings are unchanged.

## Verification

- 426/426 Node tests and 107/107 browser tests pass.
- Browser suite includes all thirty Nether/End/Sift finite-inventory routes, Overworld gameplay, cloud/profile checks, guide layouts and exact renderer pixel comparisons.
- Live server checks pass on desktop and phone: full End boss route, Sift trident-only route, protected walls, loyal recall and anvil range/lifecycle. No page errors or online service requests from the offline preview.
- A separate real-time End 6 check observes mixed open/closed shell poses and successful native audio playback: six opening clips and four closing clips by nine seconds, with zero audio failures. This check uses no virtual clock or injected contacts; its timeline and screenshot are in shulker/.
- Package doctor reports zero errors; its existing slug/filename advisories remain.

[LAN preview](http://192.168.1.4:8770/assets/playtest-0.15.0-beta6/index.html) · [Public preview](https://qcya.fun:8443/mc-block-launch/assets/playtest-0.15.0-beta6/index.html)

Build SHA-256: 6e4674c5d67e14f3ec79a37730cd97830fe51c838f149ef36381d9606037eb17

Deployment adds only the versioned static preview directory on the existing service. Formal index and leaderboard hashes and both game service PIDs were verified unchanged. No Toy publication.
