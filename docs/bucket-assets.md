# Native lava bucket assets

The full and empty bucket icons are original, unchanged 16 × 16 PNGs from
Mojang's Minecraft Java Edition 1.20.4 client archive. The cached archive's
SHA-1 was verified against the official version metadata before extracting
`assets/minecraft/textures/item/bucket.png` and `lava_bucket.png`.

The lava bucket uses the normal 28px item drawing path both in the launcher
pouch and in flight. It is drawn directly from the native item texture with
pixel smoothing disabled. No block projection, tint, replacement drawing, or
generated artwork is applied. The empty inventory icon uses the native
`bucket.png` loaded as `assets.images.bucket`.

The pour sound is the original `item/bucket/empty_lava1.ogg`, downloaded from
Mojang's resource server and verified against asset index 12. Its runtime key
is `bucket_empty_lava`.

Exact official URLs, archive paths, byte counts, and SHA-1 values are recorded
in [the asset manifest](bucket-assets.json). These images and audio remain
Mojang/Microsoft assets, separate from this project's MIT-licensed code.
