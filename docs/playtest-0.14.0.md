# 0.14.0 free-play review

LAN: http://192.168.1.4:8770/assets/playtest-0.14.0/index.html

The separate review build opens directly to all forty levels, bypasses unlocks,
and supplies 99 of each of the nine current items. A selected-item hint and
in-game “道具用法” button explain the mechanics; “换关” returns to selection.
Level “原配给” popovers still show the real release's finite supplies.

Run `node scripts/build-playtest.cjs` to create this build. Playtest mode is
compiled in exclusively for this target; normal source and `build:toy` retain
real progression. Review progress lives only in memory, uses no player profile
and never submits scores or requests the production API or Toy SDK. Completing
a real level was browser-tested while seeded formal saves remained unchanged.

Deployment adds an independent static assets path to the existing game server.
It opens no port, replaces no original front page, performs no data migration,
and restarts neither the slingshot nor mining game. SHA-256 of player data and
the existing service PIDs matched before and after. HTTPS was checked through
the existing Caddy route with certificate validation enabled.

306 Node checks and 11 targeted browser checks passed; the deployed build was
also checked at desktop and touch-phone sizes with no JS errors or formal API
requests. See `evidence/review-0.14.0/free-playtest/` for proof.
