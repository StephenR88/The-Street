# The Street

A 2D pixel-art life-simulation prototype: a small community of autonomous
NPCs rebuilding a street after an unspecified apocalypse. This repo is the
**first playable vertical slice**, not the full long-term design — see
[Architecture & Roadmap](#architecture--roadmap) below for what's deferred.

## Running it

```bash
npm install
npm run dev       # dev server with hot reload
npm run build      # production build to dist/
npm run typecheck  # tsc --noEmit
```

## Controls

- `A`/`D` or arrow keys — walk left/right
- `1` `2` `3` `4` — simulation speed (1x/2x/4x/8x)
- `Space` — pause/unpause
- `S` — save to localStorage
- `L` — load from localStorage

The HUD (top-left) shows the clock, town demand/attraction snapshot, and
whichever NPC is currently nearest the player.

## What's in the prototype

- 15 plots along one street; 9 starting NPCs (2 guaranteed founders —
  general store + clinic — with procedurally generated personalities, plus
  7 fully procedural residents)
- Day/night clock, decoupled from frame rate and pausable/fast-forwardable
- Procedural traits + ambitions that measurably affect decisions (not just
  flavor text)
- A utility-based decision system: every NPC scores candidate actions
  (sleep/eat/work/shop/socialize/idle) each "brain tick" and picks the best
  one with random jitter, rather than following a scripted schedule
- Needs (hunger, energy, social, fun, comfort, safety, purpose) that decay
  over time and drive those scores
- Directional, multi-dimensional relationships (friendship, romance, trust,
  respect, attraction, fear, resentment) — A's feelings about B are stored
  separately from B's about A
- Property ownership separated from building occupancy separated from who
  lives/works there (a landlord can own a house they don't live in)
- Visible construction/demolition state machine (buildings have levels and
  can be mid-construction), though the prototype world starts fully built
- Credits, wages, hiring, and a per-business revenue/expense ledger
- A derived town-demand snapshot (housing/employment/retail/health demand +
  an attraction score) and a probability-gated immigration stub that spawns
  new residents into vacant housing
- Versioned JSON save/load (localStorage)
- A sprite-based rendering pipeline with procedural fallback: the renderer
  checks for real art assets under `public/sprites/` and draws them when
  present, falling back to the current placeholder shapes for anything
  missing — see `public/sprites/README.md` for exactly what files to drop
  in and where. No code changes are needed to "install" art; the game
  currently ships with zero sprite files, so it's running entirely on
  fallback shapes.

Run `npm run dev`, leave it on 8x speed, and watch: NPCs wake, go to work,
get paid, go shopping, visit each other and build friendship, go home,
sleep — with zero scripted events, purely from the scoring system.

## Architecture & Roadmap

### Layering

```
src/
  core/      Clock, RNG (seeded), EventBus — no game knowledge
  data/      traits, ambitions, building levels, jobs, names — pure data tables
  sim/       the simulation itself; render-agnostic, can run headless
    npc/         NPC model, procedural generation, needs, decision (utility AI), behavior effects
    property/    Plot vs Building vs Occupancy
    relationships/ directional multi-dimension relationship graph
    economy/     wallets, employment, business ledgers, hiring
    town/        derived demand/attraction snapshot, immigration roll
    simulation.ts  orchestrator: owns all registries, ticks one sim-minute at a time
  world/     worldgen.ts — builds the starting 15-plot street
  render/    Camera + Canvas renderer + AssetLoader/sprite manifest; reads sim state, never mutates it
public/sprites/  where real art assets go (see its own README) — empty by default
  player/    input → world position, follows the same rules NPCs do
  save/      versioned JSON save/load
  ui/        HUD
  main.ts    wires it all together, the only place that touches the DOM
```

The hard rule enforced by this layering: **sim/ has no dependency on
render/, player/, ui/, or the DOM**, and can be driven headlessly (see the
scratch test scripts used during development, which ran the sim for 35+
in-game days at once with no rendering at all). This is what the design doc
calls out as essential once dozens of NPCs are ticking — simulation and
presentation must be separable.

### Deliberately deferred (by design, not oversight)

These have room in the data model already but no logic yet:

- **Memory decay** — `Memory` objects exist and are recorded, but nothing
  ages/prunes them yet.
- **Player-driven building entry / interiors** — buildings render on the
  street but aren't enterable yet.
- **NPC-initiated construction** — buildings can be constructed
  (`PropertyRegistry.startConstruction`) and the prototype uses it to build
  the starting town, but no NPC decides *on its own* to build/upgrade/
  demolish yet. That's the natural next system once ambitions need to
  reach for money thresholds.
- **Rumor propagation, families/children, crime/consequence chains,
  business failure/closure** — all explicitly out of scope for this slice
  per the design doc.
- **Trait `spendingBias`** is defined in data but not yet consumed by the
  spending logic in `behavior.ts` — flat costs are used for now. Worth
  wiring in alongside the first real spending decisions (buying an
  upgrade, starting a business).

### Suggested next slice

1. Wire `ambitionId === "ownBusiness"` NPCs (non-founders) to actually save
   toward and then claim a vacant plot + start construction once they can
   afford it — this is the smallest change that turns "immigration +
   property + construction" into one visible emergent loop.
   2. Make buildings enterable (simple interior screen) so shopping/working/
   socializing have a "you walked inside" moment instead of happening at
   the doorway.
3. Spend down the `spendingBias` trait field and start an NPC's home
   upgrading itself once savings clear a threshold — the first visible
   "the street changed while I wasn't looking" moment.
4. Drop real art into `public/sprites/` per its README. The renderer is
   already wired to use it the moment it's present — this is the one item
   on this list that's pure asset production, no code.
