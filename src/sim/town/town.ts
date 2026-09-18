import { getLevelDef } from "../../data/buildingDefs";
import type { PropertyRegistry } from "../property/property";
import type { NpcRegistry } from "../npc/npcRegistry";
import type { Economy } from "../economy/economy";

export type DemandLevel = "low" | "medium" | "high";

export interface TownSnapshot {
  population: number;
  employedCount: number;
  unemployedCount: number;
  vacantPlotCount: number;
  housingVacancySlots: number;
  hasGeneralStore: boolean;
  hasClinic: boolean;
  averageWallet: number;
  housingDemand: DemandLevel;
  employmentDemand: DemandLevel;
  retailDemand: DemandLevel;
  healthDemand: DemandLevel;
  /** 0-100 aggregate score; higher makes immigration more likely. */
  attraction: number;
}

function ratioToDemand(ratio: number, lowMax: number, medMax: number): DemandLevel {
  if (ratio <= lowMax) return "low";
  if (ratio <= medMax) return "medium";
  return "high";
}

/**
 * Recomputes the town's aggregate state from the current property, NPC,
 * and economy registries. Deliberately stateless/derived rather than
 * incrementally tracked, so it can never drift out of sync with the
 * systems it summarizes — at prototype scale recomputing every tick is
 * cheap.
 */
export function computeTownSnapshot(
  property: PropertyRegistry,
  npcs: NpcRegistry,
  economy: Economy,
): TownSnapshot {
  const activeNpcs = npcs.active();
  const population = activeNpcs.length;
  const employedCount = activeNpcs.filter((n) => n.jobId !== null).length;
  const unemployedCount = population - employedCount;

  const buildings = property.allBuildings();
  const completeResidential = buildings.filter(
    (b) => b.state === "complete" && b.occupancy.status !== undefined && b.categoryId === "house",
  );
  let housingCapacity = 0;
  let housingOccupied = 0;
  for (const b of completeResidential) {
    housingCapacity += getLevelDef(b.categoryId, b.level).capacity;
    housingOccupied += b.occupancy.residents.length;
  }
  const housingVacancySlots = Math.max(0, housingCapacity - housingOccupied);

  const hasGeneralStore = buildings.some((b) => b.categoryId === "generalStore" && b.state === "complete");
  const hasClinic = buildings.some((b) => b.categoryId === "clinic" && b.state === "complete");

  const totalWallet = activeNpcs.reduce((sum, n) => sum + economy.getBalance(n.id), 0);
  const averageWallet = population > 0 ? totalWallet / population : 0;

  const vacantPlotCount = property.vacantPlots().length;

  const housingDemand = ratioToDemand(
    population > 0 ? 1 - housingVacancySlots / Math.max(1, housingCapacity) : 0,
    0.5,
    0.8,
  );
  const employmentDemand = ratioToDemand(population > 0 ? unemployedCount / population : 0, 0.15, 0.4);
  const retailDemand = hasGeneralStore ? "low" : "high";
  const healthDemand = hasClinic ? "low" : "high";

  const attractionParts = [
    hasGeneralStore ? 20 : 0,
    hasClinic ? 20 : 0,
    housingVacancySlots > 0 ? 20 : 0,
    employmentDemand !== "high" ? 15 : 0,
    Math.max(0, Math.min(25, averageWallet / 40)),
  ];
  const attraction = Math.max(0, Math.min(100, attractionParts.reduce((a, b) => a + b, 0)));

  return {
    population,
    employedCount,
    unemployedCount,
    vacantPlotCount,
    housingVacancySlots,
    hasGeneralStore,
    hasClinic,
    averageWallet,
    housingDemand,
    employmentDemand,
    retailDemand,
    healthDemand,
    attraction,
  };
}
