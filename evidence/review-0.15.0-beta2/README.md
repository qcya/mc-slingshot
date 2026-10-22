# Beta 2 verification

- `node-tests.txt`: all **362** Node tests passed.
- `browser-tests.txt`: all **104** browser tests passed in one full run.
- `browser-routes/`: all thirty Nether, End and Sift maps cleared by actual
  mouse input with finite campaign inventories and production result/save
  handling. The unchanged Overworld ten-stage browser campaign also passed.
- `live/report.json`: deployed-build desktop and phone-sized sessions verified
  Wither HP 300 plus one summoned skeleton after a hit, progressive anvil
  excavation and disappearance, and a winning single-trident introduction
  with two durability uses left. Zero startup errors or online requests.
- `flight-and-summons.png`: eight native Dragon flight poses in both directions,
  native Wither Skeleton geometry/sword, and fixed top-centre boss bar.
- `sift-ten-scenes.png`: actual Renderer review of all ten rebuilt Sift maps,
  including the mod's original willow foliage and vines.
- `package-doctor.json`: zero errors; two existing advisory findings.
- `deployment.json`: versioned static preview path and game.js SHA-256.
  Main index/data hashes and both game service PIDs were verified unchanged
  across deployment; neither a Toy publication nor service restart occurred.

Regression coverage includes no midair/timed loyalty recall, continued flight
after glancing terrain, actual stopping/bounds recall, distinct return hits,
short-range natural anvil arcs, no apex/creature-triggered vertical plunge,
gradual full-footprint drilling/clinks, bedrock fade, nonpinning head rest,
death-to-fall recovery, and exact Wither thirds with lethal-hit summoning.
The existing crystal placement and chain-explosion tests remain unchanged.
