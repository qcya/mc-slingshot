# Fire charge and Warden asset provenance

These are original Minecraft Java Edition 1.20.4 game assets. Minecraft artwork
and audio remain the property of Mojang/Microsoft. The texture mirror is an
asset extraction source, not the author of the textures.

| Local file | Source |
| --- | --- |
| `assets/textures/fire_charge.png` (16 × 16) | [Original 1.20.4 item texture](https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/fire_charge.png) |
| `assets/textures/fire_0.png` (16 × 512, 32 animation frames) | [Original 1.20.4 fire atlas](https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/fire_0.png) |
| `assets/textures/warden.png` (128 × 128) | [Original 1.20.4 Warden skin](https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/entity/warden/warden.png) |
| `assets/sfx/fire_ignite.ogg` | Mojang `minecraft/sounds/fire/ignite.ogg`, [SHA-1 a0d1fbff7e938e92c10c1576339dda668f40e111](https://resources.download.minecraft.net/a0/a0d1fbff7e938e92c10c1576339dda668f40e111) |
| `assets/sfx/fire_launch.ogg` | Mojang `minecraft/sounds/mob/ghast/fireball4.ogg`, [SHA-1 eafa60d7ec34f86e8f07a001ddcdf5c4600bb174](https://resources.download.minecraft.net/ea/eafa60d7ec34f86e8f07a001ddcdf5c4600bb174) |
| `assets/sfx/fire_burn.ogg` | Mojang `minecraft/sounds/fire/fire.ogg`, [SHA-1 8b260108a73470c16cd244325242d4780cfb7d78](https://resources.download.minecraft.net/8b/8b260108a73470c16cd244325242d4780cfb7d78) |
| `assets/sfx/warden_hurt.ogg` | Mojang `minecraft/sounds/mob/warden/hurt_1.ogg`, [SHA-1 900d36028e1fc285b8b0de5525aaf9cccfbb10ad](https://resources.download.minecraft.net/90/900d36028e1fc285b8b0de5525aaf9cccfbb10ad) |
| `assets/sfx/warden_idle.ogg` | Mojang `minecraft/sounds/mob/warden/ambient_1.ogg`, [SHA-1 08f4163bcc82acd2bec812652bb769e572c611d7](https://resources.download.minecraft.net/08/08f4163bcc82acd2bec812652bb769e572c611d7) |

Sound hashes were resolved from Mojang's official version metadata: follow
`1.20.4` in the [version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json),
then its `assetIndex.url`, then the exact `minecraft/sounds/...` object name.

The fire-charge launch sound is the original `item.firecharge.use` event, not
flint and steel. The official [1.20.4 version metadata](https://piston-meta.mojang.com/v1/packages/2c592ccd71ca2d5dadebeb6543ad6b18e6f43305/1.20.4.json)
points to [asset index 12](https://piston-meta.mojang.com/v1/packages/129fc8163fdedb50c886731a839751c22aa0dbc6/12.json).
That index resolves `minecraft/sounds.json` to [SHA-1 0ad27c4bc62913a7814bcd1655c8bd5c9d0e1db0](https://resources.download.minecraft.net/0a/0ad27c4bc62913a7814bcd1655c8bd5c9d0e1db0).
The JSON maps `item.firecharge.use` to `mob/ghast/fireball4`; its Ogg was
downloaded directly from the Mojang resource URL above and its local SHA-1
verified. Play `fire_launch` on release. Wood ignition and crackles emit
`fire_burn`; the retained legacy `fire_ignite` file is not a fire-charge cue.

The Warden uses its own 128 × 128 atlas and anatomy rather than humanoid skin
coordinates. Dimensions and UV offsets follow Mojang's
[Warden geometry reference](https://github.com/Mojang/bedrock-samples/blob/main/resource_pack/models/entity/warden.geo.json):
18 × 21 × 11 torso, 16 × 16 × 10 head, 8 × 28 × 8 arms,
6 × 13 × 6 legs, and independent 16 × 16 tendril planes.

## Runtime contracts

`world.fires` contains active and scheduled block burns. Each record has
`{id, tx, ty, x, y, size, startedAt, endsAt, seedX, seedY}`. `x/y` are the
top-left world-space coordinates; `size` is one world-space block. Draw only
when `world.time >= startedAt`. Internal `pixels`, `burned`, and `nextSoundAt`
fields drive consumption and do not need renderer handling. Burn duration is
2.8 seconds, with a 0.13-second spread delay per cardinal step. Every record
belongs to a cardinally connected wood block whose tile-center distance is
at most two blocks from its seed: the center plus two blocks in each direction,
at most five blocks across. Foreground and rear wood share this graph.
Each record also has a `sourceIds` set: all tiles ignited by one charge share
that charge's source ID. A second charge may add its own ID to existing flames
without extending the wood's lifetime or consuming mineral pixels.

Fire emits `{type:'fire', x, y, sound:'fire_burn'}` events. The
seed emits occasional crackle events; the renderer may animate any frame of
the supplied fire atlas across every visible burning block.

Enemies expose `dimensions:{width,height}` and `feetOffset`. Warden dimensions
are 58 × 132 world pixels and `feetOffset` is 66. `MobSprites` owns the larger
200 × 180 Warden canvas. Warden HP is 300: one distinct cobblestone projectile
deals 100, one explosion deals 150, one distinct pearl deals 75, and fire/TNT
contact deals zero. Fire contact instead schedules three damage ticks at
0.6, 1.2 and 1.8 seconds after ignition: each tick deals 100/3 HP to ordinary
mobs or 50 HP to a Warden. One charge defeats an ordinary mob; a Warden has
150 HP after one charge and is defeated after six ticks from two charges.
An enemy entering burning wood receives the same three ticks. Per-enemy
`burnSources` prevents one charge being reapplied by continued overlap or by
several tiles; distinct charge IDs apply independently, including concurrent
charges. `burnTicks` stores pending `{at, damage}` records. `burningUntil` is
an absolute world time for renderer flames; existing `hurtUntil` red flashes
are updated on every damage tick. `active()` remains true while a living
enemy has pending ticks. Warden armor ignores incidental terrain/debris damage so
blast knockback does not cause a second damage charge on landing. Crossing
the arena's removal boundary defeats it, consistent with other creatures.

`addEnemy(x, feetY, skin, options)` accepts `options.stationary`. These enemies
keep their facing and do not patrol; they retain normal physics, falling,
knockback and behavior-driven standing animation.

## Pearl wall measurement

The wall budget is two complete 48-world-pixel blocks (96 pixels), independent
of pearl radius. Previous failures had three causes: a 64-pixel limit, measuring
the longer angled ray path rather than wall depth, and sampled entry/exit plus
body clearance sharing the thickness check. Simply increasing the old limit
would still reject some complete two-block walls.

`findSafeExit` takes an optional collision normal. It projects the measured
entry-to-exit material span onto that normal, refines both sampled boundaries,
and checks full circular body clearance separately. It only backtracks when
the center is already inside material, so a separate wall behind the pearl
cannot be mistaken for the contacted near face. Gaps too small to contain the
whole body do not count as exits. Grazing incidence below a 0.25 normal
projection is rejected conservatively; normal head-on and angled shots pass
two blocks, and three complete blocks remain blocked. Pearl use never alters
wall pixels or their HP, on success, failure, or a subsequent contact.

`tests/burning-pearl.test.mjs` exercises actual Matter contacts with 96/144-pixel
walls at upward, level and downward angles; exit measurement also covers
multiple radii, subpixel starting positions and blocked exits. Burn tests
exercise real contacts, exact tick damage, overlapping sources, a mobile
grounded enemy, and a Warden remaining inside multiple tiles of one flame.
