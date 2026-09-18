# Drop-in art for The Street

The renderer (`src/render/renderer.ts`) checks for every file below at
startup. Any file that exists gets drawn; any file that's missing falls
back to the current placeholder shapes. **Nothing needs to be turned on** —
just put a correctly-named PNG in the right folder and reload the page.

The full list of expected keys/paths is generated in
`src/render/spriteManifest.ts` — this doc mirrors it in plain terms.

## General rules for every sprite

- **PNG with transparency.** No background color; the renderer draws it
  over the scene.
- **Any resolution, consistent aspect ratio.** The game scales every
  sprite to fit a target size (buildings scale to the plot's footprint
  width, characters/props scale to a fixed height), so you don't need to
  match exact pixel dimensions — just draw at whatever resolution you
  want and keep the *proportions* intentional, since that's what survives
  scaling.
- **Anchor: bottom-center.** Every sprite is positioned so its bottom edge
  sits on the sidewalk and it's horizontally centered on its spot. Leave
  a little breathing room at the top of the canvas for shadows/signage
  overhang if you want it, but keep the actual ground contact at the very
  bottom pixel row.
- **Style target:** detailed, colorful pixel art — strong shading, cast
  shadows, warm lit windows at night, a hint of the post-apocalyptic
  setting still visible behind the new construction. See the project's
  root `README.md` for the full art direction from the design doc.

## `buildings/`

One file per building category + level (see `src/data/buildingDefs.ts`
for the authoritative level list — this prototype currently defines):

| File | Category | Level |
|---|---|---|
| `house_L1.png` … `house_L5.png` | House | 1–5 |
| `generalStore_L1.png` … `generalStore_L3.png` | General Store | 1–3 |
| `clinic_L1.png` … `clinic_L3.png` | Clinic | 1–3 |
| `construction_scaffold.png` | generic — shown for any building mid-construction | — |
| `demolition.png` | generic — shown for any building being demolished | — |
| `empty_lot.png` | generic — shown on bare, undeveloped plots (optional; a text label is used if absent) | — |

Later building categories (arcade, apartment, school, clinic upgrades,
etc.) just need an entry added to `BUILDING_CATEGORIES` in
`buildingDefs.ts` and a matching file here — the renderer needs no
changes.

## `characters/`

| File | Used for |
|---|---|
| `npc_0.png` … `npc_3.png` | Generic NPC variants — each NPC is deterministically assigned one of these four so the street isn't visually uniform |
| `player.png` | The player character |

Each file is a **horizontal sprite sheet, 4 frames**, all frames the same
size. The renderer only animates through the frames while the character
is walking; it holds frame 0 when idle.

## `props/`

Purely decorative streetscape dressing, repeated along the sidewalk —
not tied to any simulation data:

`street_lamp.png`, `bench.png`, `trash_can.png`, `flower_box.png`, `fire_hydrant.png`

## `backdrop/`

`ruin_0.png`, `ruin_1.png`, `ruin_2.png` — the ruined skyline visible
behind the street, tiled with a parallax scroll. Keep these low-detail/
faded — they're meant to read as distant background, not compete with
the street itself.

## `ground/`

`sidewalk_tile.png` — a horizontally-tileable strip for the ground/
sidewalk. Make sure the left and right edges line up when repeated.
