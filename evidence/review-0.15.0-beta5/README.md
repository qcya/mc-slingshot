# Beta 5: anvil audit and incremental terrain drawing

## Confirmed bugs and fixes

- Side and rising underside hits no longer teleport the anvil onto a surviving creature. Only a real downward top contact can enter the five-second head-rest state.
- A synchronous Enderman teleport cannot carry the impacting anvil to its new head position, including straight-down teleports.
- A valid head-rested anvil follows the Shulker lid as it opens, matching the original model's 24.3 px travel.
- Drilling now clears destructible moving debris and updates Matter's active sensor contacts. It can reach the protected floor instead of hanging on an unchanged fragment.
- Leaving material clears the drilling state and restores gravity through air; a later platform requires a new physical contact before drilling resumes.
- The Beta 4 flight range, mass, size, drilling speed, protected obsidian/bedrock and other weapons remain unchanged.

The original UI reproductions and inspected frames are in art/findings.json and art/. Corrected UI replay frames and reports are in art/after/.

## Drawing optimization

Foreground and rear rasters reuse their RGBA buffers and per-view material snapshots. Edits refresh a bounded rectangle, including neighboring foreground shading. Level resets rebuild the full raster.

The browser audit compares every RGBA byte against a fresh full render: 40 comparisons across four dimensions, removals, neighbor shading, material replacements, rear-only changes and level resets match exactly.

The final warmed one-anvil benchmark measured 6.80 ms to 0.60 ms per dirty draw, with 1,179,648 ImageData bytes per dirty frame reduced to zero after initialization. Timings are observations, not pass/fail thresholds. Current run reports are in performance/.

## Verification and preview

- 414/414 Node tests, including 13 new actual-Matter anvil audit cases and all forty finite-inventory map routes.
- 107/107 browser tests, including 30 complete Nether/End/Sift routes, Overworld gameplay, account/cloud checks and the two new raster audits.
- Deployed desktop and phone checks: flank hit stays near its physical contact, trident wall/return rules, extended anvil flight and expiry, two live healing crystals, final Dragon victory and the trident-only Sift victory. No page errors or online service requests.
- Package doctor has zero errors and the two existing filename/slug advisories.

[LAN preview](http://192.168.1.4:8770/assets/playtest-0.15.0-beta5/index.html)

[Public preview](https://qcya.fun:8443/mc-block-launch/assets/playtest-0.15.0-beta5/index.html)

Build SHA-256: cd30570d10282c47fbb93d16298ac8c10efa2a3f1015c8efac6d632aa66ceaf5.

Only the versioned static preview directory was added on the existing port. Formal index/leaderboard hashes and both game service PIDs were checked unchanged. No Toy publication.
