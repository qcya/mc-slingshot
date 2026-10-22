# 1.0.0 release candidate

## Fire rendering

The original fire atlas has transparent top rows. Fractional Canvas source-rectangle sampling could import an opaque pixel row from the preceding frame, producing the reported line above lava-lit stones. A small lazy cache now isolates each original frame before scaling. Mob, ground and projectile flames share this path; original PNG bytes, timing, placement and gameplay remain unchanged.

The fire/ folder contains matching before/after close-ups, 192 real-render frame/position cases across desktop/mobile, and 288 exact native-frame RGBA comparisons.

## Release profiles

- Version and announcement are 1.0.0 / 1.0 正式版.
- Official Toy package compiles PLAYTEST=false and REVIEW=false, loads the native Toy SDK and preserves existing cloud keys, five ranking mappings and score season. Gameplay uses ordinary sequential unlocks and finite supplies.
- Server confirmation build compiles PLAYTEST=false and REVIEW=true. It uses the same formal gameplay with persistent local progress under a separate review namespace, including audio/music preferences. It omits the SDK and never calls home APIs or Toy services.
- Review cannot enable free selection or extra supplies by URL parameters, saved unlock flags or public navigation methods. Reload preserves a genuinely earned first-level clear while formal save markers remain unchanged.

## Verification

- 462/462 Node tests pass.
- 116/116 browser tests pass, including all forty finite-inventory campaign routes, native SDK/cloud/ranking integration, packaged file/CDN startup, fire rendering and formal review profile checks.
- Deployed desktop and phone runs confirm version 1.0.0, no playtest tools, initial inventory [5,0,0,0], sequential world locks, a real finite victory, persistent review progress and untouched formal save markers. Zero page errors and online service requests.
- Both package doctors report zero errors and the two existing slug/filename advisories.

[Server confirmation](http://192.168.1.4:8770/assets/release-1.0.0/index.html) · [Public confirmation](https://qcya.fun:8443/mc-block-launch/assets/release-1.0.0/index.html)

Desktop upload ZIP: C:\Users\Administrator\Desktop\拉满的石_1.0正式版\拉满的石_1.0.0_TOY上传包.zip

ZIP SHA-256: 0f1e246daff78bed2baad268dba2c8358654dd7fe91121e1964faf45ad6dcb06

Official game.js SHA-256: 987b96ea28d9525fde49c782c85bdcdab9de7032f6c868a1fbaea3ae3ad8f35b

Review game.js SHA-256: 8552c584b0d6622ab13df850bcd60c4e314c72e66a4fce1680d2ce71aa10e6d0

The ZIP contains 187 root-relative files; its members and CRC were verified against the exact official build. Review transport/storage differs intentionally from the upload package; both use formal gameplay. Deployment adds only the versioned confirmation directory, preserving formal index/leaderboard hashes and both service PIDs. No Toy upload or submission has been performed; user confirmation is pending.
