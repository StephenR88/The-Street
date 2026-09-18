import type { NeedId } from "./needs";

/**
 * Trait definitions. Traits are data, not code: each one carries small
 * numeric modifiers that the decision system, economy, and relationship
 * system read generically. Adding a new trait never requires touching the
 * systems that consume traits, only this table.
 */
export interface TraitDef {
  id: string;
  name: string;
  description: string;
  /** Multiplies decay rate of specific needs (1 = unchanged). */
  needDecayModifiers?: Partial<Record<NeedId, number>>;
  /** Additive bonus applied to specific decision action tags when scoring (see decision.ts ActionTag). */
  actionScoreBonus?: Partial<Record<string, number>>;
  /** Multiplies how much of their income an NPC is willing to spend/save. Negative = save more. */
  spendingBias?: number;
  /** Multiplies how quickly relationship dimensions move toward positive with this NPC as actor. */
  socialWarmth?: number;
  /** Traits that rarely co-occur with this one (soft exclusion during generation). */
  conflictsWith?: string[];
}

export const TRAITS: readonly TraitDef[] = [
  {
    id: "ambitious",
    name: "Ambitious",
    description: "Driven to achieve their long-term goals; pushes ambition-related actions.",
    actionScoreBonus: { workOnAmbition: 18, work: 6 },
    conflictsWith: ["lazy"],
  },
  {
    id: "lazy",
    name: "Lazy",
    description: "Prefers comfort and rest over effort.",
    needDecayModifiers: { energy: 0.7 },
    actionScoreBonus: { rest: 12, work: -10, workOnAmbition: -10 },
    conflictsWith: ["ambitious", "workaholic"],
  },
  {
    id: "generous",
    name: "Generous",
    description: "Gives freely to friends and family; pays employees fairly.",
    spendingBias: 0.15,
    socialWarmth: 1.2,
    conflictsWith: ["greedy"],
  },
  {
    id: "greedy",
    name: "Greedy",
    description: "Prioritizes personal wealth, even at others' expense.",
    spendingBias: -0.25,
    actionScoreBonus: { work: 8, workOnAmbition: 8 },
    conflictsWith: ["generous"],
  },
  {
    id: "friendly",
    name: "Friendly",
    description: "Warms to new people quickly.",
    socialWarmth: 1.3,
    actionScoreBonus: { socialize: 10 },
    conflictsWith: ["shy", "private"],
  },
  {
    id: "shy",
    name: "Shy",
    description: "Uncomfortable initiating social contact.",
    actionScoreBonus: { socialize: -12 },
    conflictsWith: ["friendly", "social", "charismatic"],
  },
  {
    id: "social",
    name: "Social",
    description: "Craves company and gets restless alone.",
    needDecayModifiers: { social: 1.4 },
    actionScoreBonus: { socialize: 14 },
    conflictsWith: ["shy", "introverted"],
  },
  {
    id: "introverted",
    name: "Introverted",
    description: "Recharges alone; socializing is draining in excess.",
    needDecayModifiers: { social: 0.6 },
    conflictsWith: ["social"],
  },
  {
    id: "hotheaded",
    name: "Hot-headed",
    description: "Quick to anger, slow to forgive minor slights.",
    actionScoreBonus: { confront: 15 },
    conflictsWith: ["calm"],
  },
  {
    id: "calm",
    name: "Calm",
    description: "Even-tempered and slow to escalate conflict.",
    actionScoreBonus: { confront: -15 },
    conflictsWith: ["hotheaded"],
  },
  {
    id: "romantic",
    name: "Romantic",
    description: "Actively seeks meaningful romantic connection.",
    actionScoreBonus: { pursueRomance: 16 },
  },
  {
    id: "loyal",
    name: "Loyal",
    description: "Sticks with friends, partners, and employers through hardship.",
    socialWarmth: 1.1,
  },
  {
    id: "jealous",
    name: "Jealous",
    description: "Reacts strongly to perceived slights in relationships.",
    actionScoreBonus: { confront: 8 },
  },
  {
    id: "gossipy",
    name: "Gossipy",
    description: "Spreads information through town quickly.",
    actionScoreBonus: { socialize: 8 },
  },
  {
    id: "forgiving",
    name: "Forgiving",
    description: "Lets go of grudges faster than most.",
    conflictsWith: ["vindictive"],
  },
  {
    id: "vindictive",
    name: "Vindictive",
    description: "Holds grudges and may act to settle scores.",
    conflictsWith: ["forgiving"],
  },
  {
    id: "workaholic",
    name: "Workaholic",
    description: "Defaults to work over almost anything else.",
    actionScoreBonus: { work: 14, workOnAmbition: 10, socialize: -6 },
    conflictsWith: ["lazy"],
  },
  {
    id: "familyOriented",
    name: "Family-oriented",
    description: "Prioritizes household and kin above most else.",
    actionScoreBonus: { visitFamily: 16 },
  },
  {
    id: "materialistic",
    name: "Materialistic",
    description: "Measures success by possessions and home quality.",
    spendingBias: 0.1,
    actionScoreBonus: { workOnAmbition: 6 },
  },
  {
    id: "creative",
    name: "Creative",
    description: "Drawn to artistic pursuits and personalized spaces.",
    actionScoreBonus: { fun: 6 },
  },
  {
    id: "riskTaking",
    name: "Risk-taking",
    description: "Willing to gamble savings on new ventures.",
    conflictsWith: ["cautious"],
  },
  {
    id: "cautious",
    name: "Cautious",
    description: "Prefers safe, predictable choices; saves more.",
    spendingBias: -0.15,
    conflictsWith: ["riskTaking"],
  },
  {
    id: "adventurous",
    name: "Adventurous",
    description: "Seeks novelty and new experiences.",
    conflictsWith: ["cautious"],
  },
  {
    id: "private",
    name: "Private",
    description: "Keeps to themselves and shares little.",
    actionScoreBonus: { socialize: -10 },
    conflictsWith: ["social", "friendly"],
  },
  {
    id: "charismatic",
    name: "Charismatic",
    description: "Naturally persuasive and well-liked.",
    socialWarmth: 1.25,
    conflictsWith: ["shy"],
  },
  {
    id: "messy",
    name: "Messy",
    description: "Lets their home fall into clutter.",
    conflictsWith: ["neat"],
  },
  {
    id: "neat",
    name: "Neat",
    description: "Keeps home and business tidy and well-kept.",
    conflictsWith: ["messy"],
  },
] as const;

export const TRAIT_BY_ID: ReadonlyMap<string, TraitDef> = new Map(
  TRAITS.map((t) => [t.id, t]),
);
