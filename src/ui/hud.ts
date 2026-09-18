import { formatTime } from "../core/Clock";
import type { Simulation } from "../sim/simulation";

/** Finds the active NPC nearest the player, for a simple "who's near me" readout. */
function nearestNpc(sim: Simulation, playerX: number) {
  let best: { name: string; x: number; action: string } | null = null;
  let bestDist = Infinity;
  for (const npc of sim.npcs.active()) {
    const dist = Math.abs(npc.x - playerX);
    if (dist < bestDist) {
      bestDist = dist;
      best = { name: npc.name, x: npc.x, action: npc.currentAction.type };
    }
  }
  return best ? { ...best, dist: bestDist } : null;
}

export function renderHud(el: HTMLElement, sim: Simulation, playerX: number): void {
  const time = sim.clock.now();
  const snapshot = sim.townSnapshot();
  const near = nearestNpc(sim, playerX);

  const lines = [
    `${formatTime(time)}  (speed x${sim.clock.getSpeed()})`,
    `Population: ${snapshot.population}  Employed: ${snapshot.employedCount}  Unemployed: ${snapshot.unemployedCount}`,
    `Housing demand: ${snapshot.housingDemand}  Employment demand: ${snapshot.employmentDemand}`,
    `Retail demand: ${snapshot.retailDemand}  Health demand: ${snapshot.healthDemand}`,
    `Town attraction: ${snapshot.attraction.toFixed(0)}/100  Vacant lots: ${snapshot.vacantPlotCount}`,
    "",
    near ? `Nearest: ${near.name} — ${near.action} (${near.dist.toFixed(0)}px away)` : "Nearest: (nobody nearby)",
    "",
    "Move: A/D or Arrow keys",
    "Speed: 1/2/3/4 keys, Space = pause",
    "S = save, L = load",
  ];
  el.innerText = lines.join("\n");
}
