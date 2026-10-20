# Dimension combat assets

New entity, item and animated lava textures are original Minecraft Bedrock
assets from Mojang's `bedrock-samples` repository, pinned to commit
`46ba6ea985fb5a92d79a9419198f10dda14c199d`. They remain Mojang/Microsoft artwork.
Wind charge comes from this newer official asset set, not the previous Java
1.20.4 extraction used by older game assets.

Base URL: https://raw.githubusercontent.com/Mojang/bedrock-samples/46ba6ea985fb5a92d79a9419198f10dda14c199d/resource_pack/

| Local texture | Official path under resource_pack |
| --- | --- |
| zombified_piglin.png | textures/entity/piglin/zombie_piglin.png |
| hoglin.png | textures/entity/hoglin/hoglin.png |
| shulker.png | textures/entity/shulker/shulker_purple.png |
| enderman.tga and enderman.png | textures/entity/enderman/enderman.tga; PNG is a lossless format conversion |
| snowball.png | textures/items/snowball.png |
| slime_ball.png | textures/items/slimeball.png |
| wind_charge.png | textures/items/wind_charge.png |
| splash_water.png | textures/items/potion_bottle_splash.png |
| anvil_base.png | textures/blocks/anvil_base.png |
| anvil_top.png | textures/blocks/anvil_top_damaged_0.png |
| lava_still.png | textures/blocks/lava_still.png |
| lava_flow.png | textures/blocks/lava_flow.png |

Entity cuboid dimensions and UVs follow official `models/entity/piglin.geo.json`,
`hoglin.geo.json`, `shulker.geo.json` and `enderman.geo.json`. The game projects
the cuboids into 2D; it does not display the entire skin atlas as a sprite.
The anvil inventory sprite is rendered at runtime from its original block
textures as three stacked cuboids (`makeAnvilIcon`).

The Enderman's Bedrock material uses packed alpha for emissive information.
`MobSprites` presents the model's faces as opaque in Canvas, so the original
purple eyes and lower jaw remain visible. The downloaded TGA and its PNG
conversion are retained unchanged.

New audio is downloaded directly from Mojang's resource CDN using the official
Java 1.21.4 asset index, located through
https://piston-meta.mojang.com/mc/game/version_manifest_v2.json.
Every file's SHA-1 was verified after download; exact source keys, hashes and
URLs are in `combat-expansion-sounds.json`.

## Gameplay and renderer interfaces

Inventory order is stone, TNT, pearl, fire charge, snowball, wind charge,
water bottle, slimeball, anvil. The Nether introduces snowball, wind charge
and water bottle; the End adds slimeball and anvil. All nine positions remain
finite level inventory slots.

`world.lava.cells` is a bounded map of world-space `{x,y,size,gx,gy}` cells.
Source positions supplied to `SiegeWorld` use whole block coordinates.
Water replaces cooled foreground cells with material 40 (obsidian), rebuilds
physical terrain, and disables any source cells it cools.
Flying water bottles also react to lava cells directly, so airborne streams
do not need a solid impact surface. The circle contact check queries only
local fluid cells; removal precedes cooling and emits one splash sound event.

`enemy.pose.openAmount` ranges from 0 to 1 for Shulker lid animation; an opening
of at least 0.5 also determines one-hit vulnerability in both transition directions.
`enemy.burningUntil` controls visible burning; zombified piglins never burn.
Hoglins share Warden's 300 HP and protection against incidental landing and
debris damage. Endermen deduplicate damaging projectiles, explosions and
fire sources, then validate destinations against terrain, debris, other
living creatures, lava and screen bounds.

Effects emitted by combat are `snow`, `gust` and `splash`, each with world
coordinates and radius. Gust and splash carry `wind_burst` and `water_splash`
sound keys; heavy anvil impacts carry `anvil_land`. Shulker opening/closing
emits the corresponding native ambient sound. The anvil's 1.7 gravity scale
is used by both world simulation and the five-dot aiming preview.
