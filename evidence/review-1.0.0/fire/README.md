# Flame atlas seam regression

Root cause: Chromium's fractional destination edge sampling can read a pixel
outside a `drawImage` source rectangle, even with `imageSmoothingEnabled=false`.
The fire texture is the original 16 × 512 atlas. All 32 frame top rows are fully
transparent, but the previous frame's bright bottom row appeared above some
flames. At frame 1, destination y=20.5, the direct atlas draw produced white
RGBA `[255,255,255,127]` at (23,20), where an isolated native frame was transparent.
The same issue reproduced at mobile scale 0.48828125.

The fix caches unmodified 16 × 16 native frame canvases before scaling. Mob,
ground, and ignited projectile fire share this drawing path. Flame timing,
position, dimensions, alpha, physics, and the source PNG remain unchanged.

- Matching real lava-lit stone close-ups: `comparison-before.png` and
  `comparison-after.png`, both native frame 9 at the same fractional position.
- `desktop-before.json` and `mobile-before.json`: regression failed before the
  fix, with 31 affected frame/position combinations per viewport.
- `desktop-fire-regression.json` and `mobile-fire-regression.json`: all 96
  frame/position combinations pass per viewport, and visible fire remains in
  every case. These use actual lava ignition through `SiegeWorld.step()`.
- `native-flame-pixels.json`: 288 exact RGBA comparisons pass, covering all 32
  native frames, projectile/ground/mob dimensions, and three rendering scales.
- `diagnosis.png`, `diagnosis.json`, and `atlas-bleed-scan.json`: original image
  inspection and exploratory browser sampling evidence.

Validation: `npx playwright test tests/fire-frame.spec.cjs --reporter=list`
(3 passed); `node --test tests/fire-impact.test.mjs tests/bucket-fluid.test.mjs`
(35 passed). No full-suite run was performed by this subtask.

`assets/textures/fire_0.png` is byte-identical to commit `c61ff4b`;
SHA-256 `9d6d68cbf19f2f9aaed72086069faaedb78b9d8384b55b663fbebb2d02afeb48`.
