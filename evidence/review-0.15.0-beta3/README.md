# Beta 3: sword grip and distinct boss skills

- Wither Skeleton: native sword handle follows the actual right-hand joint in both directions and walk poses.
- Ender Dragon: two real, destructible healing crystals supply 6 HP/s each; visible beams stop when their crystal is destroyed. Fountain perch remains a direct-hit opportunity.
- Echo Golem: 1.1 s telegraph, up to 2.8 s front shield, one physical projectile reflection, then 2.4 s exposed core. Rear attacks, returning tridents and explosions bypass the shield.
- Wither three-hit summoning, player weapons, cloud save keys and ranking season remain unchanged.

## Verification

- 380/380 Node tests, including finite-inventory route replay across all forty stages.
- 105/105 Playwright browser tests, including thirty complete Nether/End/Sift routes, ten Overworld stage smoke checks, and cloud progress checks.
- Independent desktop and phone checks on the deployed preview: two Dragon crystals, real front reflection without HP loss, exposed core, Wither summon, anvil drilling/despawn, and a one-throw trident-only victory. No page errors or online leaderboard requests.
- Toy package doctor: zero errors; existing slug casing and asset filename advisories only.
- Actual model/render captures and state report are in art/. Live browser frames are in live/.

## Preview

[LAN preview](http://192.168.1.4:8770/assets/playtest-0.15.0-beta3/index.html)

[Public preview](https://qcya.fun:8443/mc-block-launch/assets/playtest-0.15.0-beta3/index.html)

Build game.js SHA-256: 30665a6c5b6f053e10a53a7b44b4c7b5f97ef98417012544bd5395f297b2e8c5.

Deployment only added the versioned static preview directory on the existing port. Formal index, leaderboard data hashes and both game service PIDs were checked unchanged. No Toy publication.
