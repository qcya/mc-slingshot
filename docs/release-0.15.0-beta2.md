# 0.15.0 Beta 2 — Corrected weapon rules and rebuilt scenes

This isolated review build follows the feedback on Beta 1. The End Crystal
rendering and placement/detonation rules are unchanged.

- Boss bars are fixed at the top centre of the screen with a clear hint row
  below. Wither charges/pulses were removed. Each distinct effective hit
  removes one third of its initial health and immediately summons a native
  Wither Skeleton on the nearest clear, supported horizontal surface. The
  lethal third hit also summons; remaining skeletons must be cleared to win.
- Anvils have shorter natural ballistic flight. Neither passing the apex nor
  touching a creature starts a vertical drill. A downward contact with real
  terrain starts gradual, audible, full-footprint excavation. It fades away
  at bedrock. A surviving creature carries a noncolliding head-rest pose for
  about five seconds; its movement is not pinned. If that creature dies,
  the anvil resumes falling.
- Loyalty recall waits for an actual stop or a screen exit. Airtime/apex
  recall and unconditional terrain-contact recall were removed. The same
  three-use durability and distinct outbound/return hits remain.
- Dragon hips, knees and feet were adjusted and inspected across eight
  flight poses/directions. The final End arena now has open sky and an
  irregular island, with a seven-block bedrock basin, single-height rims
  and one three-block central pillar.
- All ten Sift scenes were rebuilt around forest clearings, valleys,
  terraces, a broken bridge, sinkhole, grove, shaft, ridge, amphitheatre
  and broken ring. Large rectangular rear walls are removed. Original mod
  willow foliage and hanging vines complete rooted tree silhouettes.

Verification: 362 Node tests and all 104 browser tests pass. All forty stages
clear through legal mouse input and finite campaign supplies. Live desktop
and phone sessions also verify the Wither damage/summon, anvil excavation
and disappearance, and the single-trident Sift introduction. Detailed proof
is under `evidence/review-0.15.0-beta2/`.

The versioned static test directory was added under the existing game service.
The main game index, data hashes, release link and both game-service PIDs are
preserved. No Toy publication or leaderboard/save mutation was performed.

- LAN: http://192.168.1.4:8770/assets/playtest-0.15.0-beta2/index.html
- HTTPS: https://qcya.fun:8443/mc-block-launch/assets/playtest-0.15.0-beta2/index.html
