import { BUILDING_CATEGORIES } from "../data/buildingDefs";
import type { SpriteDef } from "./assets";

const NPC_VARIANT_COUNT = 4;

/**
 * Every sprite key the renderer might ask for, and where its file should
 * live under `public/sprites/`. This is the single source of truth for
 * "what art the game can use" — see public/sprites/README.md for exact
 * pixel conventions per category. Nothing here is required to exist: the
 * AssetLoader treats a missing file as "not loaded yet" and the renderer
 * falls back to procedural shapes.
 */
export function buildManifest(): Record<string, SpriteDef> {
  const manifest: Record<string, SpriteDef> = {};

  for (const category of BUILDING_CATEGORIES) {
    for (const level of category.levels) {
      manifest[buildingSpriteKey(category.id, level.level)] = {
        src: `sprites/buildings/${category.id}_L${level.level}.png`,
      };
    }
  }
  manifest["building.underConstruction"] = { src: "sprites/buildings/construction_scaffold.png" };
  manifest["building.demolishing"] = { src: "sprites/buildings/demolition.png" };
  manifest["building.emptyLot"] = { src: "sprites/buildings/empty_lot.png" };

  for (let i = 0; i < NPC_VARIANT_COUNT; i++) {
    manifest[`npc.variant${i}`] = {
      src: `sprites/characters/npc_${i}.png`,
      frameCount: 4,
      frameDurationMs: 120,
    };
  }
  manifest["player"] = { src: "sprites/characters/player.png", frameCount: 4, frameDurationMs: 110 };

  manifest["prop.streetLamp"] = { src: "sprites/props/street_lamp.png" };
  manifest["prop.bench"] = { src: "sprites/props/bench.png" };
  manifest["prop.trashCan"] = { src: "sprites/props/trash_can.png" };
  manifest["prop.flowerBox"] = { src: "sprites/props/flower_box.png" };
  manifest["prop.fireHydrant"] = { src: "sprites/props/fire_hydrant.png" };

  manifest["backdrop.ruin0"] = { src: "sprites/backdrop/ruin_0.png" };
  manifest["backdrop.ruin1"] = { src: "sprites/backdrop/ruin_1.png" };
  manifest["backdrop.ruin2"] = { src: "sprites/backdrop/ruin_2.png" };

  manifest["ground.sidewalk"] = { src: "sprites/ground/sidewalk_tile.png" };

  return manifest;
}

export function buildingSpriteKey(categoryId: string, level: number): string {
  return `building.${categoryId}.L${level}`;
}

/** Deterministically assigns one of a small set of generic character sprites to an NPC, so the town isn't visually uniform without needing per-NPC art. */
export function npcSpriteKey(npcId: string): string {
  let hash = 0;
  for (let i = 0; i < npcId.length; i++) hash = (hash * 31 + npcId.charCodeAt(i)) >>> 0;
  return `npc.variant${hash % NPC_VARIANT_COUNT}`;
}

export const PROP_SPRITE_KEYS = [
  "prop.streetLamp",
  "prop.bench",
  "prop.trashCan",
  "prop.flowerBox",
  "prop.fireHydrant",
] as const;
