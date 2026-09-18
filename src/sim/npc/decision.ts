import type { RNG } from "../../core/RNG";
import { TRAIT_BY_ID } from "../../data/traits";
import { AMBITION_BY_ID } from "../../data/ambitions";
import { JOB_BY_ID } from "../../data/jobDefs";
import type { NPC, ActionType, CurrentAction } from "./npc";

export interface VisitCandidate {
  npcId: string;
  x: number;
  /** Higher = NPC is more inclined to visit this person right now (relationship + trait based). */
  affinity: number;
}

export interface DecisionContext {
  minuteOfDay: number;
  hour: number;
  homeX: number | null;
  workX: number | null;
  storeX: number | null;
  visitCandidates: VisitCandidate[];
  rng: RNG;
}

interface ScoredCandidate {
  type: ActionType;
  score: number;
  targetX?: number;
  targetBuildingId?: string;
  targetNpcId?: string;
}

/** Sums the actionScoreBonus for `tag` across all of an NPC's traits and their ambition. */
function traitAndAmbitionBonus(npc: NPC, tag: string): number {
  let bonus = 0;
  for (const traitId of npc.traits) {
    const trait = TRAIT_BY_ID.get(traitId);
    bonus += trait?.actionScoreBonus?.[tag] ?? 0;
  }
  const ambition = AMBITION_BY_ID.get(npc.ambitionId);
  bonus += ambition?.actionScoreBonus?.[tag] ?? 0;
  return bonus;
}

function isMealtime(hour: number): boolean {
  return (hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 20);
}

/**
 * Scores every candidate action for this NPC right now and returns the
 * winner. This is the heart of the "simulation AI, not scripted behavior"
 * requirement: every NPC runs the same function, and different outcomes
 * come purely from their traits/ambition/needs/context, plus a random
 * jitter so identical NPCs don't act in lockstep.
 */
export function decideAction(npc: NPC, ctx: DecisionContext, nowMinute: number): CurrentAction {
  const jitter = () => ctx.rng.float(-8, 8);
  const candidates: ScoredCandidate[] = [];

  const isNight = ctx.hour < 6 || ctx.hour >= 22;
  candidates.push({
    type: "sleep",
    score: (100 - npc.needs.energy) * (isNight ? 1.1 : 0.25) + (isNight ? 20 : 0) + jitter(),
    targetX: ctx.homeX ?? undefined,
  });

  if (ctx.homeX !== null) {
    candidates.push({
      type: "eat",
      score: (100 - npc.needs.hunger) * 1.0 + (isMealtime(ctx.hour) ? 15 : 0) + jitter(),
      targetX: ctx.homeX,
    });
  }

  if (npc.jobId && ctx.workX !== null) {
    // A business operator (jobId "operator") has no JobDef entry — they keep standard hours instead of an employee's.
    const job = JOB_BY_ID.get(npc.jobId);
    const startHour = job?.startHour ?? 8;
    const endHour = job?.endHour ?? 18;
    const withinHours = ctx.hour >= startHour && ctx.hour < endHour;
    if (withinHours) {
      const fatiguePenalty = npc.needs.energy < 20 ? -30 : 0;
      candidates.push({
        type: "work",
        score: 55 + traitAndAmbitionBonus(npc, "work") + fatiguePenalty + jitter(),
        targetX: ctx.workX,
        targetBuildingId: npc.workBuildingId ?? undefined,
      });
    }
  }

  if (ctx.storeX !== null && ctx.hour >= 9 && ctx.hour < 19) {
    candidates.push({
      type: "shop",
      score: (100 - npc.needs.comfort) * 0.45 + jitter(),
      targetX: ctx.storeX,
    });
  }

  if (ctx.visitCandidates.length > 0 && ctx.hour >= 8 && ctx.hour < 22) {
    const best = ctx.visitCandidates.reduce((a, b) => (b.affinity > a.affinity ? b : a));
    candidates.push({
      type: "socialize",
      score: (100 - npc.needs.social) * 0.8 + traitAndAmbitionBonus(npc, "socialize") + best.affinity * 0.2 + jitter(),
      targetX: best.x,
      targetNpcId: best.npcId,
    });
  }

  if (ctx.homeX !== null) {
    candidates.push({
      type: "idle",
      score: 22 + jitter(),
      targetX: ctx.homeX,
    });
  } else {
    candidates.push({ type: "idle", score: 15 + jitter() });
  }

  let winner = candidates[0]!;
  for (const c of candidates) {
    if (c.score > winner.score) winner = c;
  }

  const action: CurrentAction = { type: winner.type, startedMinute: nowMinute };
  if (winner.targetX !== undefined) action.targetX = winner.targetX;
  if (winner.targetBuildingId !== undefined) action.targetBuildingId = winner.targetBuildingId;
  if (winner.targetNpcId !== undefined) action.targetNpcId = winner.targetNpcId;
  return action;
}
