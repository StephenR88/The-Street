import { Clock, type ClockSaveData } from "../core/Clock";
import { RNG } from "../core/RNG";
import { EventBus } from "../core/EventBus";
import { PropertyRegistry, type PropertySaveData } from "./property/property";
import { NpcRegistry } from "./npc/npcRegistry";
import type { NpcSaveData } from "./npc/npc";
import { RelationshipManager, type RelationshipSaveData } from "./relationships/relationshipManager";
import { Economy, type EconomySaveData } from "./economy/economy";
import { tryFindEmployment } from "./economy/hiring";
import { applyNeedDecay } from "./npc/needs";
import { stepMovement, applyActionEffects } from "./npc/behavior";
import { decideAction, type VisitCandidate } from "./npc/decision";
import { computeTownSnapshot, type TownSnapshot } from "./town/town";
import { rollForImmigration } from "./town/immigration";
import { generateNpc } from "./npc/npcFactory";
import { getLevelDef } from "../data/buildingDefs";

export interface SimEvents {
  "day.tick": { day: number };
  "npc.immigrated": { npcId: string };
  [key: string]: unknown;
}

/** Maximum sim-minutes processed per real frame, so a backgrounded tab can't cause a huge catch-up stall on return. */
const MAX_MINUTES_PER_FRAME = 60;
/** How often (sim-minutes) an NPC reconsiders its action even if the current one hasn't naturally ended. */
const RECONSIDER_INTERVAL_MINUTES = 15;

export interface SimulationSaveData {
  seed: string;
  rngState: number;
  clock: ClockSaveData;
  property: PropertySaveData;
  npcs: NpcSaveData;
  relationships: RelationshipSaveData;
  economy: EconomySaveData;
}

export class Simulation {
  clock = new Clock();
  readonly rng: RNG;
  property = new PropertyRegistry();
  npcs = new NpcRegistry();
  relationships = new RelationshipManager();
  economy = new Economy();
  readonly events = new EventBus<SimEvents>();

  /** Set by the player controller each frame; used for future render/sim LOD decisions. */
  playerX = 0;

  private lastDailyTickDay = -1;
  readonly seed: string;

  constructor(seed: string) {
    this.seed = seed;
    this.rng = RNG.fromString(seed);
  }

  /** Advances the simulation by real elapsed ms. Returns how many sim-minutes were processed. */
  update(realDeltaMs: number): number {
    const ticked = Math.min(this.clock.advance(realDeltaMs), MAX_MINUTES_PER_FRAME);
    for (let i = 0; i < ticked; i++) {
      this.simulateMinute();
    }
    return ticked;
  }

  private homeX(homePlotId: string | null): number | null {
    if (!homePlotId) return null;
    const plot = this.property.getPlot(homePlotId);
    return plot ? plot.x + plot.width / 2 : null;
  }

  private buildingEntranceX(buildingId: string | null | undefined): number | null {
    if (!buildingId) return null;
    const building = this.property.getBuilding(buildingId);
    if (!building) return null;
    const plot = this.property.getPlot(building.plotId);
    return plot ? plot.x + plot.width / 2 : null;
  }

  private nearestCompleteStoreX(): number | null {
    for (const building of this.property.allBuildings()) {
      if (building.categoryId === "generalStore" && building.state === "complete") {
        return this.buildingEntranceX(building.id);
      }
    }
    return null;
  }

  private simulateMinute(): void {
    const time = this.clock.now();

    for (const npc of this.npcs.active()) {
      applyNeedDecay(npc, 1);
      const arrived = stepMovement(npc);
      const finished = applyActionEffects(npc, arrived, {
        economy: this.economy,
        property: this.property,
        relationships: this.relationships,
        getNpc: (id) => this.npcs.get(id),
        nowMinute: time.totalMinutes,
        hour: time.hour,
      });

      const stale = time.totalMinutes - npc.currentAction.startedMinute >= RECONSIDER_INTERVAL_MINUTES;
      if (finished || stale) {
        const visitCandidates: VisitCandidate[] = this.npcs
          .active()
          .filter((other) => other.id !== npc.id)
          .map((other) => {
            const rel = this.relationships.get(npc.id, other.id);
            return { npcId: other.id, x: other.x, affinity: 8 + (rel?.scores.friendship ?? 0) };
          });

        npc.currentAction = decideAction(
          npc,
          {
            minuteOfDay: time.hour * 60 + time.minute,
            hour: time.hour,
            homeX: this.homeX(npc.homePlotId),
            workX: this.buildingEntranceX(npc.workBuildingId),
            storeX: this.nearestCompleteStoreX(),
            visitCandidates,
            rng: this.rng,
          },
          time.totalMinutes,
        );
      }
    }

    if (time.day !== this.lastDailyTickDay) {
      this.lastDailyTickDay = time.day;
      this.dailyTick(time.day);
    }
  }

  private dailyTick(day: number): void {
    for (const building of this.property.allBuildings()) {
      if (building.state === "underConstruction") {
        this.property.advanceConstruction(building.id, 1);
      } else if (building.state === "demolishing") {
        this.property.advanceDemolition(building.id, 1);
      }
    }

    for (const npc of this.npcs.active()) {
      if (!npc.jobId) {
        const hired = tryFindEmployment(npc.id, this.property, this.npcs, this.economy, day * 1440);
        if (hired) {
          npc.jobId = hired.jobId;
          npc.workBuildingId = hired.buildingId;
        }
      }
    }

    const snapshot = this.townSnapshot();
    if (rollForImmigration(this.rng, snapshot)) {
      this.spawnImmigrant(day);
    }

    this.events.emit("day.tick", { day });
  }

  private spawnImmigrant(day: number): void {
    const house = this.property.allBuildings().find((b) => {
      if (b.categoryId !== "house" || b.state !== "complete") return false;
      const capacity = getLevelDef(b.categoryId, b.level).capacity;
      return b.occupancy.residents.length < capacity;
    });
    if (!house) return;

    const npc = generateNpc(this.rng, this.npcs.nextId());
    npc.homePlotId = house.plotId;
    const x = this.buildingEntranceX(house.id);
    if (x !== null) npc.x = x;
    this.property.moveInResident(house.id, npc.id, "rental", 40);
    this.economy.deposit(npc.id, this.rng.int(80, 400));
    npc.currentAction = { type: "idle", startedMinute: day * 1440 };
    this.npcs.add(npc);
    this.events.emit("npc.immigrated", { npcId: npc.id });
  }

  townSnapshot(): TownSnapshot {
    return computeTownSnapshot(this.property, this.npcs, this.economy);
  }

  toJSON(): SimulationSaveData {
    return {
      seed: this.seed,
      rngState: this.rng.getState(),
      clock: this.clock.toJSON(),
      property: this.property.toJSON(),
      npcs: this.npcs.toJSON(),
      relationships: this.relationships.toJSON(),
      economy: this.economy.toJSON(),
    };
  }

  static fromJSON(data: SimulationSaveData): Simulation {
    const sim = new Simulation(data.seed);
    sim.rng.setState(data.rngState);
    sim.clock = Clock.fromJSON(data.clock);
    sim.property = PropertyRegistry.fromJSON(data.property);
    sim.npcs = NpcRegistry.fromJSON(data.npcs);
    sim.relationships = RelationshipManager.fromJSON(data.relationships);
    sim.economy = Economy.fromJSON(data.economy);
    return sim;
  }
}
