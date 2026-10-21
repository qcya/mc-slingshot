# Native entity assets

The Wither, Ender Dragon and placed End Crystal use Mojang's original cuboid
models and atlases from `Mojang/bedrock-samples`, pinned to commit
`46ba6ea985fb5a92d79a9419198f10dda14c199d`. Exact source URLs and SHA-256 hashes
are in [native-entity-assets.json](native-entity-assets.json). The dragon's TGA
is converted to PNG preserving RGB texels; Bedrock's emissive alpha metadata is
not interpreted as transparent skin. These assets remain Mojang assets and are
separate from this game's code license.

Blub, Sifter, Singer and Echo Golem use the original geometry and PNG textures
from Mielon's The Sift mod. Files were read from the cached `mielon-sift.jar` as
a ZIP; no mod code was executed. The mod's original MIT license is preserved
verbatim at `assets/licenses/Mielon-The-Sift-MIT.txt`. Manifest entries retain
the exact paths inside the archive. The original JSONs remain in `assets/models`;
`src/native-model-data.mjs` embeds the same JSON so static builds need no extra
model fetch. Source UVs, bone parents, pivots, geometry rotations, flat antlers,
and cube shapes are retained. The dragon renderer reconstructs the runtime
neck/tail instances and leg/wing joints which Mojang's native renderer assembles
from template bones. Local animation and orthographic projection are adaptations.

Encounter roles, combat phases, the Singer elite and the Echo Golem final boss
are adaptations for this game; they do not claim to reproduce the complete mod.

Singer hurt, death and idle clips are the mod's original OGG files, covered by
the preserved MIT license. Blub uses vanilla axolotl clips and Sifter uses parrot
clips, matching the mod's sound-event references. Echo Golem's mod references
copper golem events, absent from the cached 1.20.4 index; its hurt/death clips
use documented vanilla iron golem fallbacks, with existing Warden ambience.
Wither, Dragon and Loyalty return clips are original Mojang OGGs downloaded
by asset SHA-1 from `resources.download.minecraft.net`; every download was
verified against the official asset-index hash. Sources are recorded in
[native-boss-sounds.json](native-boss-sounds.json). No added meme or music clips.

The anvil uses the existing original block textures. Its top samples the opaque
ten-pixel strip of `anvil_top.png`, so transparent atlas gutters do not cut holes
in the model. Daylight shading and a fuller canvas fit make the stepped shape
legible. The trident retains the original item pixels with a masked animated
enchantment sheen and velocity-directed flight/return presentation. The wooden
sling artwork is unchanged.
