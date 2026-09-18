export type RelationshipDimension =
  | "friendship"
  | "romance"
  | "trust"
  | "respect"
  | "attraction"
  | "fear"
  | "resentment";

export const RELATIONSHIP_DIMENSIONS: readonly RelationshipDimension[] = [
  "friendship",
  "romance",
  "trust",
  "respect",
  "attraction",
  "fear",
  "resentment",
];

export type RelationshipScores = Record<RelationshipDimension, number>;

export function neutralScores(): RelationshipScores {
  return {
    friendship: 0,
    romance: 0,
    trust: 0,
    respect: 0,
    attraction: 0,
    fear: 0,
    resentment: 0,
  };
}

export interface Memory {
  id: string;
  description: string;
  /** 0-100; higher-importance memories persist longer and weigh more on decisions. */
  importance: number;
  createdMinute: number;
  effects: Partial<Record<RelationshipDimension, number>>;
}

/** A directional edge: how `from` feels about `to`. The reverse edge is a separate, independent record. */
export interface RelationshipEdge {
  from: string;
  to: string;
  scores: RelationshipScores;
  memories: Memory[];
}

export type RelationshipLabel =
  | "stranger"
  | "acquaintance"
  | "friend"
  | "closeFriend"
  | "bestFriend"
  | "rival"
  | "enemy"
  | "romanticInterest"
  | "partner";

export function classify(scores: RelationshipScores): RelationshipLabel {
  if (scores.resentment >= 60 && scores.friendship < 20) return "enemy";
  if (scores.resentment >= 35 && scores.respect < 30) return "rival";
  if (scores.romance >= 70) return "partner";
  if (scores.romance >= 35) return "romanticInterest";
  if (scores.friendship >= 80) return "bestFriend";
  if (scores.friendship >= 55) return "closeFriend";
  if (scores.friendship >= 25) return "friend";
  if (scores.friendship > 0 || scores.trust > 0) return "acquaintance";
  return "stranger";
}
