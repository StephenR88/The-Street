import { getLevelDef } from "../../data/buildingDefs";
import { jobsForCategory } from "../../data/jobDefs";
import type { PropertyRegistry } from "../property/property";
import type { NpcRegistry } from "../npc/npcRegistry";
import { Economy } from "./economy";

/**
 * Owner traits shift the wage they're willing to pay, per the design doc's
 * "greedy owner suppresses wages / generous owner pays well" example.
 */
function wageModifierForOwner(npcs: NpcRegistry, operatorId: string): number {
  const owner = npcs.get(operatorId);
  if (!owner) return 1;
  if (owner.traits.includes("greedy")) return 0.82;
  if (owner.traits.includes("generous")) return 1.18;
  return 1;
}

/**
 * Looks for any complete, staffed business with an open position and hires
 * the NPC if one exists. Used both for starting-population job assignment
 * and for immigrants arriving with no job yet.
 */
export function tryFindEmployment(
  npcId: string,
  property: PropertyRegistry,
  npcs: NpcRegistry,
  economy: Economy,
  nowMinute: number,
): { buildingId: string; jobId: string } | null {
  for (const building of property.allBuildings()) {
    if (building.state !== "complete") continue;
    const operatorId = building.occupancy.operatorId;
    if (!operatorId || operatorId === npcId) continue;
    const levelDef = getLevelDef(building.categoryId, building.level);
    const currentEmployees = economy.employeesOf(building.id).length;
    // Reserve one capacity slot for the operator themself.
    if (currentEmployees >= levelDef.capacity - 1) continue;
    const jobs = jobsForCategory(building.categoryId);
    if (jobs.length === 0) continue;
    const job = jobs[0]!;
    const wage = Economy.baseWageFor(job.id) * wageModifierForOwner(npcs, operatorId);
    economy.hire(npcId, building.id, job.id, wage, nowMinute);
    return { buildingId: building.id, jobId: job.id };
  }
  return null;
}
