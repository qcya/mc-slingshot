# Beta 4: projectile rules and End islands

- Trident outbound contacts only shatter glass and damage creatures. Stone, brick, wood, other terrain and their rear pixels retain their material and HP. Returning loyalty remains non-destructive.
- Obsidian now shares bedrock's infinite hardness in terrain, rear layers and debris. Anvil drills stop at either material, fade and disappear without deleting protected pixels or the layer below.
- The anvil's measured full-pull ground range is 3.08–3.64 times Beta 3 over four launch angles; mass 9, size 42 and the gradual 210 px/s drill remain. Shared launch/gravity rules keep aiming dots consistent.
- All ten End maps have an empty bottom row in both physical and rear layers. End scenery also leaves this space as void. Only the final exit fountain contains bedrock.
- Dragon towers are straight two-block rectangles, 10 and 12 blocks tall, with fully supported healing crystals and separated Shulkers.

## Verification

- 397/397 Node tests. New integration tests exercise real projectile contacts, mixed glass geometry, glass debris, creature hits, repeated TNT and crystal blasts, static/debris obsidian drill stops and tiny protected fragments.
- 105/105 Playwright tests, including ten full Nether, End and Sift routes each, Overworld gameplay and native cloud/leaderboard checks.
- All forty maps retain legal finite-inventory wins. End 10 and Sift 2–10 have regenerated legal routes; no ammunition budgets increased.
- Production renderer captures and physical material counts for End 3/5/10 are in art/.
- Deployed desktop/phone checks are recorded in live/: real trident wall stop/return with zero terrain removal, extended anvil flight, final Dragon victory and a single-throw trident-only Sift win. No page errors or online service requests.
- Package doctor: zero errors, two existing non-blocking filename/slug advisories.

## Preview

[LAN](http://192.168.1.4:8770/assets/playtest-0.15.0-beta4/index.html)

[Public](https://qcya.fun:8443/mc-block-launch/assets/playtest-0.15.0-beta4/index.html)

Build SHA-256: 79d107e3774f265b05ba4be892bbbbe3bb21487c1b50300767fd44b26f876814.

Deployment added only the versioned static preview on port 8770. Formal front page, leaderboard file hashes and both game service PIDs were checked unchanged. No Toy publication.
