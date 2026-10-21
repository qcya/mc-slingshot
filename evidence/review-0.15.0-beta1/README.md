# Weapons and bosses review

- Node: 346/346 passing. `node-tests.txt`.
- Browser: 104 unique cases passing. The full run passed 103; its worker had
  already loaded the former one-throw Sift demo fixture when that test was
  updated to replay the new three-throw route. The updated fixture was then
  rerun independently and passed. Both logs are retained, rather than hiding
  the first failure. No production-code change was needed for that rerun.
- Every Nether, End and Sift level cleared through real mouse input, legal
  finite inventories and production outcome/save handling. Thirty detailed
  browser routes are in `browser-routes/`. The unchanged Overworld campaign
  also passed its full browser playthrough.
- Live desktop and phone-sized sessions cleared the trident-only Sift level,
  verified the anvil remains on bedrock, and reported zero errors/online
  requests. `live/report.json`, with screenshots from the deployed build.
- Package doctor: zero errors; the existing slug-style and unfingerprinted
  filename advisories remain. `package-doctor.json`.
- Deployment added a static directory. Main index/data hashes and both game
  service PIDs matched before/after promotion; no service restart, main
  release switch, port change or Toy publication. `deployment.json`.

Native geometry was visually inspected and tested across poses/facing
directions, including Dragon wing/foot joints. See the model gallery and the
source/hash records under `docs/`.
