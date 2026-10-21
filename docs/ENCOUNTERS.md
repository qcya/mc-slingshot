# Dimension encounters

The Nether final stage is an open Wither summoning basin with basalt side towers. The End final stage is an irregular Endstone island under open sky. Its exit fountain has a bedrock basin, raised side rims and a narrow central pedestal for the dragon's perch. The Sift final stage is a broken circular shrine rooted in unequal natural hills.

## Native Sift source and adaptation

The four Sift species use the community mod's actual entity names, original PNG skin atlases and GeckoLib cuboid geometry from the cached MIT-licensed Mielon Sift release. The cached JAR was inspected as a ZIP archive only, never executed. Source and license provenance are recorded with the assets. Blub is the small eared quadruped; Sifter is the broad low quadruped; Singer is the tall antlered creature; Echo Golem is the crowned construct. They are not reskinned vanilla Pillagers or Wardens.

The two ordinary encounter roles (Blub/Sifter), Singer elite role and Echo Golem final-boss role are adaptations for Stone at Full Draw. In particular this project does not claim that Echo Golem is an official vanilla or upstream mod boss. Its combat timing, health and reflective shield are original game rules.

## Readable behavior

| Creature | Health | Behavior |
|---|---:|---|
| Blub | 100 | Ordinary supported patrol; short body and ears |
| Sifter | 100 | Ordinary supported patrol; low broad body |
| Singer | 200 | Holds its pedestal; charges a song before a short-range airborne-ammo pulse |
| Echo Golem | 450 | Telegraphs a front shield, reflects one incoming projectile, then exposes its core |
| Wither | 450 | Calm, subtle hover; each of three effective hits summons a grounded Wither Skeleton |
| Wither Skeleton | 100 | Ground walker spawned on the nearest supported clear horizontal surface |
| Ender Dragon | 600 | Two destructible pylon crystals heal 6 HP/s each; it circles then returns to the fountain |

The dragon's two pylon crystals use ordinary placed-crystal bodies and destruction triggers. Each live owned crystal heals 6 HP/s, capped at 600 health; destroying it immediately removes that beam and healing contribution. The dragon stays vulnerable and never resurrects. Its fountain perch rewards direct stone, slime, pearl, trident and anvil damage by 1.5.

Echo Golem faces the launcher. It telegraphs for 1.1 seconds, raises its shield for up to 2.8 seconds, then exposes its core for 2.4 seconds. One incoming front projectile is physically reflected away and immediately breaks the shield into that recovery window. The reflection leaves its damage source available for a later legitimate hit. Rear shots, returning tridents and explosions bypass the shield. Direct attacks against the exposed core deal 1.5 damage. No dragon or golem gust pulse remains; the Singer alone retains its small telegraphed song pulse.

The Wither never charges or pulses. Every distinct effective attack removes exactly one third of its initial health; each confirmed hit, including the killing hit, summons one Wither Skeleton. The summon scans real terrain for the nearest level surface with full floor support, viewport bounds, empty body space and no creature overlap. Summoned actors join the ordinary remaining-enemy victory condition.

Weapon knockback temporarily takes priority over flight steering. The Wither and dragon retain Matter bodies, collisions and gravity compensation while flying.

Sift stage 1 supplies one trident with three durability uses. Its three low native targets share an open forest firing corridor. The remaining scenes vary the landforms rather than filling a rectangular room behind every group:

| Stage | Composition |
|---|---|
| 1 | Overgrown forest clearing |
| 2 | Two valley banks and a recessed floor |
| 3 | Four ascending ruin terraces |
| 4 | Broken willow bridge over a deep channel |
| 5 | Descending sinkhole with an open low arena |
| 6 | Grove of isolated wooden shelf platforms |
| 7 | Tall open shaft between two cliffs |
| 8 | Split ridge with broken stone monoliths |
| 9 | Natural descending amphitheatre |
| 10 | Open broken ring and central crowned construct |

All Sift scenes use native mod terrain, ruins and willow materials. Sparse rear trunks and roots add depth; none has a room-sized rear wall. Foreground landforms and platforms are real collision geometry.

## Validation

`node --test tests/encounters.test.mjs` checks actual body clearance and floor support, three distinct campaign bosses, native Sift species coverage, 30 seconds of bounded Matter flight, pulse range and warning timing, and frozen/dead/weapon-impulse behavior. `scripts/check-encounter-playability.mjs` regenerates finite-ammunition routes through legal float32 launcher drags and the production outcome timer; canonical route replay is in `tests/dimension-playability.test.mjs`.
