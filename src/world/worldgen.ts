import { getLevelDef } from "../data/buildingDefs";
import { generateNpc } from "../sim/npc/npcFactory";
import { idleAction } from "../sim/npc/npc";
import type { Simulation } from "../sim/simulation";
import type { Building, Plot } from "../sim/property/property";
import { tryFindEmployment } from "../sim/economy/hiring";

export const PLOT_WIDTH = 160;
export const PROTOTYPE_PLOT_COUNT = 15;
/** Sentinel jobId for an NPC who operates their own business rather than being paid a wage. */
export const OPERATOR_JOB_ID = "operator";

function instantlyComplete(sim: Simulation, building: Building): void {
  const levelDef = getLevelDef(building.categoryId, building.targetLevel);
  sim.property.advanceConstruction(building.id, levelDef.constructionDays);
}

/**
 * Builds the first-playable-prototype street: 15 plots, a general store, a
 * clinic, six houses, and 9 starting NPCs (two guaranteed founders + seven
 * procedural residents). Everything else on the street starts as an empty
 * lot, matching the "small, quiet, underdeveloped" opening the design doc
 * asks for.
 */
export function generateWorld(sim: Simulation, plotCount = PROTOTYPE_PLOT_COUNT): void {
  const plots: Plot[] = [];
  for (let i = 0; i < plotCount; i++) {
    const plot: Plot = {
      id: `plot_${i + 1}`,
      index: i,
      x: i * PLOT_WIDTH,
      width: PLOT_WIDTH,
      ownerId: null,
      landValue: 400,
      buildingId: null,
    };
    sim.property.addPlot(plot);
    plots.push(plot);
  }

  const storeFounder = generateNpc(sim.rng, sim.npcs.nextId(), {
    forcedAmbitionId: "ownBusiness",
    founderRole: "generalStore",
  });
  const clinicFounder = generateNpc(sim.rng, sim.npcs.nextId(), {
    forcedAmbitionId: "ownBusiness",
    founderRole: "clinic",
  });

  const storePlot = plots[0]!;
  const storeBuilding = sim.property.startConstruction(storePlot.id, "generalStore");
  instantlyComplete(sim, storeBuilding);
  sim.property.setOwner(storePlot.id, storeFounder.id);
  sim.property.setOperator(storeBuilding.id, storeFounder.id);
  storeFounder.jobId = OPERATOR_JOB_ID;
  storeFounder.workBuildingId = storeBuilding.id;

  const clinicPlot = plots[1]!;
  const clinicBuilding = sim.property.startConstruction(clinicPlot.id, "clinic");
  instantlyComplete(sim, clinicBuilding);
  sim.property.setOwner(clinicPlot.id, clinicFounder.id);
  sim.property.setOperator(clinicBuilding.id, clinicFounder.id);
  clinicFounder.jobId = OPERATOR_JOB_ID;
  clinicFounder.workBuildingId = clinicBuilding.id;

  const houseBuildings: Building[] = [];
  for (let i = 2; i < 8; i++) {
    const plot = plots[i]!;
    const building = sim.property.startConstruction(plot.id, "house");
    instantlyComplete(sim, building);
    houseBuildings.push(building);
  }

  const others = Array.from({ length: 7 }, () => generateNpc(sim.rng, sim.npcs.nextId()));

  const houseAssignments: { building: Building; residents: string[]; ownerId: string; rental?: number }[] = [
    { building: houseBuildings[0]!, residents: [storeFounder.id], ownerId: storeFounder.id },
    { building: houseBuildings[1]!, residents: [clinicFounder.id], ownerId: clinicFounder.id },
    { building: houseBuildings[2]!, residents: [others[0]!.id, others[1]!.id], ownerId: others[0]!.id },
    { building: houseBuildings[3]!, residents: [others[2]!.id, others[3]!.id], ownerId: others[2]!.id },
    { building: houseBuildings[4]!, residents: [others[4]!.id, others[5]!.id], ownerId: storeFounder.id, rental: 35 },
    { building: houseBuildings[5]!, residents: [others[6]!.id], ownerId: others[6]!.id },
  ];

  const allNpcs = [storeFounder, clinicFounder, ...others];

  for (const assignment of houseAssignments) {
    const plotIndex = plots.findIndex((p) => p.id === assignment.building.plotId);
    const plot = plots[plotIndex]!;
    sim.property.setOwner(plot.id, assignment.ownerId);
    const entranceX = plot.x + plot.width / 2;
    const status = assignment.rental ? "rental" : "ownerOccupied";
    for (const residentId of assignment.residents) {
      sim.property.moveInResident(assignment.building.id, residentId, status, assignment.rental);
      const npc = allNpcs.find((n) => n.id === residentId)!;
      npc.homePlotId = plot.id;
      npc.x = entranceX;
    }
  }

  // Give founders a starting cushion and place them at their shop to start the day.
  sim.economy.deposit(storeFounder.id, 600);
  sim.economy.deposit(clinicFounder.id, 600);
  storeFounder.x = storePlot.x + storePlot.width / 2;
  clinicFounder.x = clinicPlot.x + clinicPlot.width / 2;

  for (const npc of others) {
    sim.economy.deposit(npc.id, sim.rng.int(60, 220));
  }

  for (const npc of allNpcs) {
    npc.currentAction = idleAction(0);
    sim.npcs.add(npc);
  }

  // Seed initial employment so the town isn't 100% idle on day one.
  for (const npc of others) {
    if (npc.jobId) continue;
    const hired = tryFindEmployment(npc.id, sim.property, sim.npcs, sim.economy, 0);
    if (hired) {
      npc.jobId = hired.jobId;
      npc.workBuildingId = hired.buildingId;
    }
  }
}
