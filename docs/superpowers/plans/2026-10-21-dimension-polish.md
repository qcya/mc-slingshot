# Dimension progression and Minecraft fidelity implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Make the nine items useful, restore the default Shulker appearance, keep combat visible, and prepare the fourth ten-level campaign without losing existing saves.

**Architecture:** Stable item IDs and a declarative unlock registry separate ownership from per-level supplies. World definitions own boards and dependencies; existing ten-stage save keys and boards remain unchanged. New weapons use the same Matter collision, damage, sound and rendering paths as existing weapons.

**Tech Stack:** JavaScript ES modules, Matter.js, Canvas 2D, Node tests, Playwright, esbuild.

**Spec:** User-approved review and October 21 corrections: Overworld four original items; Nether slimeball then anvil; End wind charge then end crystal; Sift trident. Crystal has TNT damage and chain-detonates when hit, without a timer. Shulker uses original undyed skin. Community mod reuse requires verified package provenance and licensing.

## Global constraints

- Preserve current account cloud storage, three existing world scores, save keys and season.
- Nine fixed inventory positions; unlocked items remain visible with zero supply in earlier worlds.
- Keep native sound effects and embedded image/audio support for Toy and file previews.
- Do not publish Toy; produce a desktop ZIP for manual upload after verification.
- Preserve unrelated `docs/TOY.md` and publication evidence changes.

## Review focus

- An inert crystal must not detonate from its own landing or a walking creature.
- A crystal chain detonates each crystal once, before blast impulses can scatter it.
- Old saves derive item ownership from valid completion times, including earlier-world revisits.
- HUD must remain below the playable canvas, with correct aim coordinates on phones.
- A fourth-world placeholder must never silently load an Overworld map or submit a false total score.

### Task 1: Weapon and unlock registry

Files: `src/config.mjs`, `src/campaign.mjs`, `src/app.mjs`, `src/guide.mjs`, tests.

- [x] Add failing progression and actual crystal/trident collision tests; run and confirm failures.
- [x] Add stable nine-item ordering and completion-derived ownership; allocate useful finite supplies.
- [x] Implement placed end crystals, bounded one-shot chain explosions and penetrating trident hits.
- [x] Verify existing resting-projectile, pearl, ice legacy behavior and legal routes.

### Task 2: Visual and native feedback corrections

Files: `assets/textures/shulker.png`, `docs/dimension-combat-assets.md`, `style.css`, audio assets and relevant renderer/world modules.

- [x] Use the pinned official undyed Shulker texture and document its provenance.
- [x] Add a browser test proving the nine-slot bar never covers the combat canvas; implement a dedicated lower HUD strip.
- [x] Check desktop and phone screenshots, aim, selection, pause and native audio.

### Task 3: Fourth-world integration

Files: world registry, levels, timing/score clients, server validation and tests.

- [x] Inspect the community mod package, record exact license/source hashes and reusable assets.
- [x] Build ten authored Sift stages only from verified assets; no mislabeled official mechanics.
- [x] Add sequential gates, board 5 for Sift and board 1 for valid forty-stage totals; preserve boards 2–4.
- [x] Verify forty legal clears, cloud restore and all-board isolation.

### Task 4: Delivery

- [x] Run the meaningful full Node and browser suites, review changes and package doctor.
- [x] Commit/push only this task's files; produce the ZIP on Desktop and report any unfinished scope truthfully.

Execution record: all four worlds have ten verified finite-supply routes. Node 306/306; full browser suite 99/99 plus two new browser cases (101 unique). Seven native death clips verified against official SHA-1. Toy doctor: zero errors, two pre-existing advisory warnings. Existing three-world save keys/boards/season preserved; Sift uses its own cloud envelope. No Toy publication or remote leaderboard mutation performed.
