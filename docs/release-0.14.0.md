# 0.14.0 — 四界挑战

Approved progression: Overworld four original items; Nether slimeball then anvil;
End wind charge then end crystal; Sift trident. The fixed nine-slot bar retains
all globally earned icons when replaying earlier campaigns. Snowball and water
are removed from campaign supplies, with their old simulation IDs retained.

End crystals remain placed, have no fuse and use TNT-equivalent explosion
damage. A fast damaging projectile triggers nearby crystals; a whole connected
group is removed before its explosions apply impulses. Tridents penetrate
creatures, hit each creature once, and collide with solid terrain.

Ten Sift stages use verified MIT block textures from Mielon's The Sift 1.1.1.
The browser game implements its own combat/level logic. Author license is
included in the actual Toy package. Asset source hashes: `sift-assets.json`.

Visual/audio corrections: the Shulker uses Mojang's default undyed texture;
the HUD sits below a complete 16:9 playfield; lethal hits use seven original
species-specific death sounds once. Native audio remains embedded for local
file previews and separate-CDN Toy hosting.

Existing Toy work: ID 45155222811648, slug Stone_at_Full_Draw. This work is an
update to that game. No Toy publication or platform-board management was done.
The client mapping is Overworld 2, Nether 3, End 4, Sift 5, forty-stage total 1.
Platform labels/activation for slots 1 and 5 must match this when uploading.
Each campaign submits only after ten valid completions; total requires all
forty valid stage times. The same signed SDK encoding covers the full range.

Existing account save keys, season and scores are preserved. Sift uses
`mcslingshot_sift_v1` so older three-world clients cannot overwrite its cloud
data. Home-server totals are derived from complete per-world records, with
existing version-4 data retained across restart.

Verification: 306 Node tests; 99-case browser suite plus two new cases, all
passing. Forty stages cleared through real launcher input and finite supplies;
native cloud restore tested in isolated simulated accounts. Proof is under
`evidence/review-0.14.0/`. Toy doctor found zero errors; two unchanged advisories
concern slug styling and filenames without content fingerprints.

The server processes and ports for other games were not changed.
