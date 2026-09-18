/**
 * The fixed set of NPC needs. Kept as a const tuple (not an enum) so it can
 * be iterated for save serialization, UI, and decay loops.
 */
export const NEED_IDS = [
  "hunger",
  "energy",
  "social",
  "fun",
  "comfort",
  "safety",
  "purpose",
] as const;

export type NeedId = (typeof NEED_IDS)[number];

export type NeedState = Record<NeedId, number>;

/** How fast each need decays per sim-minute, on a 0-100 scale, baseline before trait modifiers. */
export const BASE_NEED_DECAY_PER_MINUTE: NeedState = {
  hunger: 0.045,
  energy: 0.03,
  social: 0.02,
  fun: 0.018,
  comfort: 0.012,
  safety: 0.006,
  purpose: 0.01,
};

export function fullNeeds(value = 80): NeedState {
  const state = {} as NeedState;
  for (const id of NEED_IDS) state[id] = value;
  return state;
}
