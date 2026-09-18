/**
 * Long-term NPC ambitions. Each ambition nudges the decision system toward
 * a family of actions (via actionScoreBonus) and gives the town-simulation
 * layer a hook for bigger moves later (starting a business, buying
 * property) without hardcoding per-NPC behavior.
 */
export interface AmbitionDef {
  id: string;
  name: string;
  description: string;
  actionScoreBonus?: Partial<Record<string, number>>;
}

export const AMBITIONS: readonly AmbitionDef[] = [
  {
    id: "becomeWealthy",
    name: "Become wealthy",
    description: "Accumulate significant savings and property.",
    actionScoreBonus: { work: 10, workOnAmbition: 10 },
  },
  {
    id: "ownBusiness",
    name: "Own a business",
    description: "Establish and run a successful business in town.",
    actionScoreBonus: { workOnAmbition: 14 },
  },
  {
    id: "startFamily",
    name: "Start a family",
    description: "Find a partner and build a household together.",
    actionScoreBonus: { pursueRomance: 12, visitFamily: 8 },
  },
  {
    id: "impressiveHome",
    name: "Own an impressive home",
    description: "Upgrade their home as far as it will go.",
    actionScoreBonus: { work: 6, workOnAmbition: 8 },
  },
  {
    id: "becomePopular",
    name: "Become popular",
    description: "Be known and liked by as much of the town as possible.",
    actionScoreBonus: { socialize: 14 },
  },
  {
    id: "helpRebuild",
    name: "Help rebuild the community",
    description: "Contribute to the town's essential services and public good.",
    actionScoreBonus: { work: 8, workOnAmbition: 10 },
  },
  {
    id: "peacefulLife",
    name: "Live a peaceful life",
    description: "Avoid conflict and prioritize a stable, quiet routine.",
    actionScoreBonus: { rest: 6, confront: -12 },
  },
  {
    id: "manyFriends",
    name: "Have many friends",
    description: "Build a wide social circle across the town.",
    actionScoreBonus: { socialize: 16 },
  },
] as const;

export const AMBITION_BY_ID: ReadonlyMap<string, AmbitionDef> = new Map(
  AMBITIONS.map((a) => [a.id, a]),
);

/**
 * Ambitions guaranteed to exist among the starting NPCs so essential
 * services always get founded, independent of personality randomization.
 * Personality (traits) stays procedural; only the *goal* is pinned.
 */
export const KEY_ROLE_AMBITIONS = ["ownBusiness"] as const;
