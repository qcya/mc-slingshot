# Beta 7: one-use lava bucket

## Player behavior

- The formal sixth slot replaces the anvil with the original Minecraft lava bucket texture. After throwing its only charge, the inventory displays the original empty bucket and cannot fire it again. Resetting the level restores that level's configured supply.
- Allocation is exactly one bucket in Nether 4/7/9, End 4/6 and Sift 6; zero elsewhere, including the Dragon arena and other boss finales. Free play respects the same bucket allocation. Other free-play items keep their existing allowances.
- A first physical contact removes the projectile and pours a single source at the contact. A clipped, connected source handles tight spaces without teleporting through walls. Actual terrain and rotating debris block flow; End void flow exits the screen without an invisible floor.
- Touching special bucket lava latches a visible 50 HP / 0.6 s burn until death, including normally fire-immune enemies and targets that leave the liquid. Even brief between-update contacts count. Map lava retains its existing damage and immunity rules.
- Merging flow tracks each source's actual arrival, so an existing distant lava pool cannot gain bucket potency before the new front reaches it.
- Original bucket images and native pour audio are byte-verified against official Java 1.20.4 assets; provenance is in docs/bucket-assets.json. Player guide and update notice explain the new item.

## Verification

- Final source: 460/460 Node tests pass, including 20 bucket-fluid cases, 10 physical projectile cases, every enemy profile, all forty finite-inventory campaign routes, one-use supplies, legacy replay compatibility and asset fidelity.
- Full browser sweep: 109 of 110 passed. The remaining test still expected 99 sixth-slot items in the Dragon preview; its expected supply was corrected to the requested zero. All four affected Dragon/desktop bucket/phone bucket/native asset tests then passed on the final source. Both original and follow-up logs are retained; no remaining failing test.
- The full browser sweep includes all thirty Nether/End/Sift completed routes and Overworld gameplay. Existing cloud, account, leaderboard, guide, mobile, direct-file and hosted-package checks passed.
- Six independently replayed first-shot bucket plans each kill at least one enemy on the actual allocated maps, using finite supplies and legal sling input; these are partial usability demonstrations, separately from the complete campaign routes. The final replay includes exact source hashes.
- Deployed desktop and phone checks: one bucket, visible empty bucket, no second use, one lava source, two enemies killed, no terrain removed, native pour audio played, no Dragon bucket, final Dragon victory in nine legal throws, and the trident-only Sift victory. No page errors or online service requests.
- Package doctor: zero errors; two pre-existing slug/filename advisories.

[LAN preview](http://192.168.1.4:8770/assets/playtest-0.15.0-beta7/index.html) · [Public preview](https://qcya.fun:8443/mc-block-launch/assets/playtest-0.15.0-beta7/index.html)

Build SHA-256: a084d61b6b02de8c77fc50c13daaf877876efe80448013275b3c3d17c18cd46c

Only the versioned static preview directory was added. Formal index/leaderboard hashes and both game service PIDs were verified unchanged. No Toy publication and no save/board migration.
