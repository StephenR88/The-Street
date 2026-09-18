import type { NeedState } from "../../data/needs";
import type { PlotId, BuildingId } from "../property/property";

export type NpcId = string;

export type ActionType =
  | "sleep"
  | "eat"
  | "goToWork"
  | "work"
  | "takeBreak"
  | "shop"
  | "socialize"
  | "goHome"
  | "idle";

export interface CurrentAction {
  type: ActionType;
  startedMinute: number;
  /** World-space x the NPC is walking toward, if any (walking is implicit while x !== targetX). */
  targetX?: number;
  targetBuildingId?: BuildingId;
  targetNpcId?: NpcId;
}

export interface NPC {
  id: NpcId;
  name: string;
  traits: string[];
  ambitionId: string;
  /** If set, this NPC's founding purpose in town (e.g. "generalStore"). Personality is still procedural. */
  founderRole?: string;
  needs: NeedState;
  homePlotId: PlotId | null;
  workBuildingId: BuildingId | null;
  jobId: string | null;
  x: number;
  currentAction: CurrentAction;
  /** True once this NPC has fully moved into town and is active in the sim. */
  active: boolean;
}

export function idleAction(minute: number): CurrentAction {
  return { type: "idle", startedMinute: minute };
}

export interface NpcSaveData {
  npcs: NPC[];
  nextNpcSeq: number;
}
