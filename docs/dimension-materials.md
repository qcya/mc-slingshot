# Dimension block textures

The added block artwork is extracted unchanged from the official Minecraft
Java Edition 1.20.4 client. It is original Mojang/Microsoft artwork, not a new
texture pack or artwork covered by this project's code license.

- [Official version metadata](https://piston-meta.mojang.com/v1/packages/2c592ccd71ca2d5dadebeb6543ad6b18e6f43305/1.20.4.json)
- [Official client archive](https://piston-data.mojang.com/v1/objects/fd19469fed4a4b4c15b2d5133985f0e3e7816a8a/client.jar)
- Client SHA-1: `fd19469fed4a4b4c15b2d5133985f0e3e7816a8a`; 24,445,539 bytes.
- Archive directory: `assets/minecraft/textures/block/`.
- Local directory: `assets/textures/`; original filenames and PNG bytes retained.

| Material ID | Original filename |
| --- | --- |
| 24 | `netherrack.png` |
| 25 | `nether_bricks.png` |
| 26 | `red_nether_bricks.png` |
| 27 | `blackstone.png` |
| 28 | `polished_blackstone_bricks.png` |
| 29 | `basalt_side.png` |
| 30 | `soul_soil.png` |
| 31 | `crimson_planks.png` |
| 32 | `warped_planks.png` |
| 33 | `crimson_stem.png` |
| 34 | `warped_stem.png` |
| 35 | `glowstone.png` |
| 36 | `end_stone.png` |
| 37 | `end_stone_bricks.png` |
| 38 | `purpur_block.png` |
| 39 | `purpur_pillar.png` |
| 40 | `obsidian.png` |

All listed files are 16 × 16 block textures except `crimson_stem.png` and
`warped_stem.png`, which retain their original 16 × 80 animation atlases. The
block renderer samples their first 16 × 16 frame without modifying the source
PNGs. Animated lava and mob/item atlases are managed separately.
