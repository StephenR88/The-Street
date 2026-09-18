import type { RNG } from "../../core/RNG";
import { TRAITS, TRAIT_BY_ID } from "../../data/traits";
import { AMBITIONS } from "../../data/ambitions";
import { FIRST_NAMES, LAST_NAMES } from "../../data/names";
import { fullNeeds } from "../../data/needs";
import { idleAction, type NPC } from "./npc";

export interface GenerateNpcOptions {
  /** Pins the ambition (e.g. "ownBusiness") while personality traits stay procedural. */
  forcedAmbitionId?: string;
  /** Marks this NPC as the intended founder of a given building category, e.g. "generalStore". */
  founderRole?: string;
  minTraits?: number;
  maxTraits?: number;
}

/** Picks 3-5 traits, softly avoiding declared conflicts so results stay coherent. */
function pickTraits(rng: RNG, min: number, max: number): string[] {
  const count = rng.int(min, max);
  const chosen: string[] = [];
  const pool = [...TRAITS];
  while (chosen.length < count && pool.length > 0) {
    const idx = rng.int(0, pool.length - 1);
    const candidate = pool[idx]!;
    pool.splice(idx, 1);
    const conflicts = candidate.conflictsWith ?? [];
    if (chosen.some((id) => conflicts.includes(id))) continue;
    const candidateConflictsWithChosen = chosen.some((id) =>
      (TRAIT_BY_ID.get(id)?.conflictsWith ?? []).includes(candidate.id),
    );
    if (candidateConflictsWithChosen) continue;
    chosen.push(candidate.id);
  }
  return chosen;
}

export function generateNpc(rng: RNG, id: string, options: GenerateNpcOptions = {}): NPC {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  const traits = pickTraits(rng, options.minTraits ?? 3, options.maxTraits ?? 5);
  const ambitionId = options.forcedAmbitionId ?? rng.pick(AMBITIONS).id;

  const needs = fullNeeds(0);
  for (const key of Object.keys(needs) as (keyof typeof needs)[]) {
    needs[key] = rng.int(55, 95);
  }

  const npc: NPC = {
    id,
    name: `${first} ${last}`,
    traits,
    ambitionId,
    ...(options.founderRole ? { founderRole: options.founderRole } : {}),
    needs,
    homePlotId: null,
    workBuildingId: null,
    jobId: null,
    x: 0,
    currentAction: idleAction(0),
    active: true,
  };
  return npc;
}
