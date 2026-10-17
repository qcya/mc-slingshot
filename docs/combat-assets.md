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
| `assets/sfx/fire_burn.ogg` | Mojang `minecraft/sounds/fire/fire.ogg`, [SHA-1 8b260108a73470c16cd244325242d4780cfb7d78](https://resources.download.minecraft.net/8b/8b260108a73470c16cd244325242d4780cfb7d78) |
| `assets/sfx/warden_hurt.ogg` | Mojang `minecraft/sounds/mob/warden/hurt_1.ogg`, [SHA-1 900d36028e1fc285b8b0de5525aaf9cccfbb10ad](https://resources.download.minecraft.net/90/900d36028e1fc285b8b0de5525aaf9cccfbb10ad) |
| `assets/sfx/warden_idle.ogg` | Mojang `minecraft/sounds/mob/warden/ambient_1.ogg`, [SHA-1 08f4163bcc82acd2bec812652bb769e572c611d7](https://resources.download.minecraft.net/08/08f4163bcc82acd2bec812652bb769e572c611d7) |

Sound hashes were resolved from Mojang's official version metadata: follow
`1.20.4` in the [version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json),
then its `assetIndex.url`, then the exact `minecraft/sounds/...` object name.

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
at most three blocks from its seed. Foreground and rear wood share this graph.

Fire emits `{type:'fire', x, y, sound:'fire_ignite'|'fire_burn'}` events. The
seed emits occasional crackle events; the renderer may animate any frame of
the supplied fire atlas across every visible burning block.

Enemies expose `dimensions:{width,height}` and `feetOffset`. Warden dimensions
are 58 × 132 world pixels and `feetOffset` is 66. `MobSprites` owns the larger
200 × 180 Warden canvas. Warden HP is 300: one distinct cobblestone projectile
deals 100, one explosion deals 150, one distinct pearl deals 75, and fire/TNT
contact deals zero. Warden armor ignores incidental terrain/debris damage so
blast knockback does not cause a second damage charge on landing. Crossing
the arena's removal boundary defeats it, consistent with other creatures.
