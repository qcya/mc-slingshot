# 0.15.0 Beta 1 — Weapons and dimension bosses

This is an isolated review build. It does not publish to Toy or replace the
home server's main game. The ordinary Toy build retains the existing save
keys, score season and five board mappings. Test mode uses ephemeral storage,
does not load the Toy SDK, and makes no profile/score/cloud requests.

- One Loyalty trident has three durability uses, shown as a durability bar.
  A second throw is blocked until it returns. Outbound and return each hit a
  creature at most once; return ignores terrain. It also recalls at screen
  boundaries. Sift 1 supplies only this trident, including in the test build.
- The 42px anvil uses brighter original block textures. Its longer launch and
  vertical plunge share the actual Matter flight rules with the aim preview.
  It digs its full footprint through foreground/rear pixels, stops at bedrock
  and stays there. Resting anvils cause no contact damage.
- Crystals use the original floating core, two glass shells and pedestal.
  Placement needs a horizontal support under the centre; side/corner wall
  contacts cannot place it. Every other fast projectile can trigger one;
  wind bursts trigger crystals within range through walls. Chains retain
  TNT-equivalent damage and remove the group before applying explosion forces.
- Nether 10 has a Wither, End 10 an Ender Dragon. Sift uses Blub and Sifter as
  ordinary creatures, Singer as elite, and an adapted Echo Golem boss in a
  new central shrine arena. Bounded flight, visible charging, local pulses
  and recovery windows distinguish the encounters. Original model/texture
  and sound provenance is documented in `native-entities.md`.

All thirty changed-dimension routes were regenerated/replayed with finite
supplies and legal float32 launcher inputs. The Sift trident-only level wins
in three throws. Live desktop and phone-sized browser checks also completed
that level and verified a planted anvil, with no startup errors or online
requests. Detailed verification is under `evidence/review-0.15.0-beta1/`.

Review URLs:

- LAN: http://192.168.1.4:8770/assets/playtest-0.15.0-beta1/index.html
- HTTPS: https://qcya.fun:8443/mc-block-launch/assets/playtest-0.15.0-beta1/index.html

Deployment added a static versioned directory beneath the existing service.
The main index and leaderboard data hashes and both game-service PIDs were
checked before/after promotion. No port allocation, restart or main release
symlink switch was needed.
