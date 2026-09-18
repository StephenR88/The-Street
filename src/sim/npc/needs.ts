import { BASE_NEED_DECAY_PER_MINUTE, NEED_IDS, type NeedId } from "../../data/needs";
import { TRAIT_BY_ID } from "../../data/traits";
import type { NPC } from "./npc";

/** Decays every need by its per-minute rate, modified by the NPC's traits, over `minutes` sim-minutes. */
export function applyNeedDecay(npc: NPC, minutes: number): void {
  for (const need of NEED_IDS) {
    let rate = BASE_NEED_DECAY_PER_MINUTE[need];
    for (const traitId of npc.traits) {
      const modifier = TRAIT_BY_ID.get(traitId)?.needDecayModifiers?.[need];
      if (modifier !== undefined) rate *= modifier;
    }
    npc.needs[need] = Math.max(0, npc.needs[need] - rate * minutes);
  }
}

export function satisfyNeed(npc: NPC, need: NeedId, amount: number): void {
  npc.needs[need] = Math.min(100, npc.needs[need] + amount);
}
