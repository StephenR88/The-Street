import type { Economy } from "../economy/economy";
import type { PropertyRegistry } from "../property/property";
import type { RelationshipManager } from "../relationships/relationshipManager";
import { satisfyNeed } from "./needs";
import type { NPC, NpcId } from "./npc";
import { idleAction } from "./npc";

export const WALK_SPEED_PER_MINUTE = 4;

/** Moves the NPC one sim-minute toward its current action's target. Returns true once it has arrived (or has no target). */
export function stepMovement(npc: NPC): boolean {
  const target = npc.currentAction.targetX;
  if (target === undefined) return true;
  const delta = target - npc.x;
  if (Math.abs(delta) <= WALK_SPEED_PER_MINUTE) {
    npc.x = target;
    return true;
  }
  npc.x += Math.sign(delta) * WALK_SPEED_PER_MINUTE;
  return false;
}

export interface ActionEffectContext {
  economy: Economy;
  property: PropertyRegistry;
  relationships: RelationshipManager;
  getNpc: (id: NpcId) => NPC | undefined;
  nowMinute: number;
  hour: number;
}

/**
 * Applies the per-minute consequences of an NPC's current action once
 * they've arrived at its target, and decides whether the action is
 * finished (so the decision system should pick a new one). Keeping this
 * separate from decision.ts means "what an action does" and "which action
 * to pick" can evolve independently.
 */
export function applyActionEffects(npc: NPC, arrived: boolean, ctx: ActionEffectContext): boolean {
  if (!arrived) return false;

  switch (npc.currentAction.type) {
    case "sleep": {
      satisfyNeed(npc, "energy", 0.9);
      satisfyNeed(npc, "comfort", 0.2);
      return npc.needs.energy >= 95 || (ctx.hour >= 6 && ctx.hour < 22);
    }
    case "eat": {
      satisfyNeed(npc, "hunger", 3);
      ctx.economy.withdraw(npc.id, 0.4);
      return npc.needs.hunger >= 92;
    }
    case "work": {
      const buildingId = npc.currentAction.targetBuildingId;
      const building = buildingId ? ctx.property.getBuilding(buildingId) : undefined;
      const operatorId = building?.occupancy.operatorId;
      const employment = ctx.economy.getEmployment(npc.id);
      if (building && operatorId && employment) {
        ctx.economy.payWages(employment, operatorId, 1);
      }
      satisfyNeed(npc, "purpose", 0.3);
      npc.needs.energy = Math.max(0, npc.needs.energy - 0.02);
      return false; // ends when work hours end, handled by decision re-check
    }
    case "shop": {
      const buildingId = npc.currentAction.targetBuildingId;
      const building = buildingId ? ctx.property.getBuilding(buildingId) : undefined;
      const operatorId = building?.occupancy.operatorId;
      if (building && operatorId) {
        ctx.economy.recordSale(building.id, operatorId, npc.id, 6);
      }
      satisfyNeed(npc, "comfort", 20);
      return true;
    }
    case "socialize": {
      satisfyNeed(npc, "social", 2);
      const other = npc.currentAction.targetNpcId ? ctx.getNpc(npc.currentAction.targetNpcId) : undefined;
      if (other) {
        ctx.relationships.adjust(npc.id, other.id, { friendship: 0.15, trust: 0.05 });
        satisfyNeed(other, "social", 0.5);
      }
      return npc.needs.social >= 90 || ctx.nowMinute - npc.currentAction.startedMinute > 60;
    }
    case "idle": {
      satisfyNeed(npc, "comfort", 0.3);
      satisfyNeed(npc, "fun", 0.2);
      return ctx.nowMinute - npc.currentAction.startedMinute > 30;
    }
    case "goHome":
    case "goToWork":
    default:
      return true;
  }
}

export function resetToIdle(npc: NPC, minute: number): void {
  npc.currentAction = idleAction(minute);
}
