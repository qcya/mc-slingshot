# Dimension encounters

The Nether final stage is an open Wither summoning basin with basalt side towers. The End final stage is an open dragon island with obsidian pylons and a low central perch. The Sift final stage is a broken circular shrine cross-section with a central Echo Golem dais, rather than another pair of residential towers.

## Native Sift source and adaptation

The four Sift species use the community mod's actual entity names, original PNG skin atlases and GeckoLib cuboid geometry from the cached MIT-licensed Mielon Sift release. The cached JAR was inspected as a ZIP archive only, never executed. Source and license provenance are recorded with the assets. Blub is the small eared quadruped; Sifter is the broad low quadruped; Singer is the tall antlered creature; Echo Golem is the crowned construct. They are not reskinned vanilla Pillagers or Wardens.

The two ordinary encounter roles (Blub/Sifter), Singer elite role and Echo Golem final-boss role are adaptations for Stone at Full Draw. In particular this project does not claim that Echo Golem is an official vanilla or upstream mod boss. Its combat timing, health and projectile pulse are original game rules.

## Readable behavior

| Creature | Health | Behavior |
|---|---:|---|
| Blub | 100 | Ordinary supported patrol; short body and ears |
| Sifter | 100 | Ordinary supported patrol; low broad body |
| Singer | 200 | Holds its pedestal; charges a song before a short-range airborne-ammo pulse |
| Echo Golem | 450 | Braces its crown, pulses, then exposes a recovery window |
| Wither | 450 | Hovers across the open basin, charges and briefly holds position |
| Ender Dragon | 600 | Circles the island, then descends to a predictable central perch |

Boss recovery multiplies direct stone, slime, pearl, trident and anvil damage by 1.5. Other phases never introduce invulnerability, healing or an automatic terrain explosion. A pulse occurs once per cycle after a visible charge; it only nudges nearby airborne ammunition. Placed crystals, resting projectiles, actors and terrain are unaffected. Weapon knockback temporarily takes priority over flight steering. The Wither and dragon retain Matter bodies, collisions and gravity compensation while flying.

Sift stage 1 supplies one trident with three durability uses. Its three low native targets share an open firing corridor. A complete legal production-input route uses all three throws and waits for loyalty return between throws.

## Validation

`node --test tests/encounters.test.mjs` checks actual body clearance and floor support, three distinct campaign bosses, native Sift species coverage, 30 seconds of bounded Matter flight, pulse range and warning timing, and frozen/dead/weapon-impulse behavior. `scripts/check-encounter-playability.mjs` regenerates finite-ammunition routes through legal float32 launcher drags and the production outcome timer; canonical route replay is in `tests/dimension-playability.test.mjs`.
