import { getLevelDef } from "../../data/buildingDefs";

export type PlotId = string;
export type BuildingId = string;
export type NpcId = string;

/**
 * A Plot is bare land. Ownership lives here and is deliberately separate
 * from whatever building (if any) currently sits on it, and separate again
 * from who lives/works there (Occupancy, on the Building). This is what
 * lets a landlord own a house a different NPC lives in, or an empty lot
 * change owners years before anything is built on it.
 */
export interface Plot {
  id: PlotId;
  /** Position along the street, 0-based, left to right. */
  index: number;
  /** World-space left edge, in pixels, at the default zoom. */
  x: number;
  width: number;
  /** null = unclaimed / town-owned land, available to purchase. */
  ownerId: NpcId | null;
  landValue: number;
  buildingId: BuildingId | null;
}

export type ConstructionState = "underConstruction" | "complete" | "demolishing";

export type OccupancyStatus = "ownerOccupied" | "rental" | "vacant";

export interface Occupancy {
  /** NPCs who live here (residential) or informally treat it as their place. */
  residents: NpcId[];
  status: OccupancyStatus;
  /** Credits per in-game week, only meaningful when status === "rental". */
  rentPerWeek?: number;
  /** For commercial/civic buildings: the NPC operating the business, if any. */
  operatorId: NpcId | null;
}

export interface Building {
  id: BuildingId;
  plotId: PlotId;
  categoryId: string;
  /** Level currently complete and visible. 0 while the first level is still under construction. */
  level: number;
  /** Level being built toward. Equals `level` once construction finishes. */
  targetLevel: number;
  state: ConstructionState;
  /** In-game days accumulated toward the current construction step. */
  constructionProgressDays: number;
  occupancy: Occupancy;
}

export function emptyOccupancy(): Occupancy {
  return { residents: [], status: "vacant", operatorId: null };
}

export interface PropertySaveData {
  plots: Plot[];
  buildings: Building[];
  nextBuildingSeq: number;
}

/**
 * Owns and mutates all Plot/Building state. This is the single source of
 * truth for "what does the street physically look like right now" — the
 * renderer reads it, never writes it.
 */
export class PropertyRegistry {
  private plots = new Map<PlotId, Plot>();
  private buildings = new Map<BuildingId, Building>();
  private nextBuildingSeq = 1;

  addPlot(plot: Plot): void {
    this.plots.set(plot.id, plot);
  }

  getPlot(id: PlotId): Plot | undefined {
    return this.plots.get(id);
  }

  getBuilding(id: BuildingId): Building | undefined {
    return this.buildings.get(id);
  }

  buildingOnPlot(plotId: PlotId): Building | undefined {
    const plot = this.plots.get(plotId);
    if (!plot?.buildingId) return undefined;
    return this.buildings.get(plot.buildingId);
  }

  allPlots(): Plot[] {
    return [...this.plots.values()].sort((a, b) => a.index - b.index);
  }

  allBuildings(): Building[] {
    return [...this.buildings.values()];
  }

  vacantPlots(): Plot[] {
    return this.allPlots().filter((p) => !p.buildingId);
  }

  setOwner(plotId: PlotId, ownerId: NpcId | null): void {
    const plot = this.plots.get(plotId);
    if (!plot) throw new Error(`Unknown plot ${plotId}`);
    plot.ownerId = ownerId;
  }

  /** Begins construction of level 1 of `categoryId` on an empty plot. */
  startConstruction(plotId: PlotId, categoryId: string): Building {
    const plot = this.plots.get(plotId);
    if (!plot) throw new Error(`Unknown plot ${plotId}`);
    if (plot.buildingId) throw new Error(`Plot ${plotId} already has a building`);
    const building: Building = {
      id: `bld_${this.nextBuildingSeq++}`,
      plotId,
      categoryId,
      level: 0,
      targetLevel: 1,
      state: "underConstruction",
      constructionProgressDays: 0,
      occupancy: emptyOccupancy(),
    };
    this.buildings.set(building.id, building);
    plot.buildingId = building.id;
    return building;
  }

  /** Queues an upgrade of an already-complete building to the next level. */
  startUpgrade(buildingId: BuildingId): void {
    const building = this.buildings.get(buildingId);
    if (!building) throw new Error(`Unknown building ${buildingId}`);
    if (building.state !== "complete") return;
    const category = building.categoryId;
    const nextLevel = building.level + 1;
    // Will throw via getLevelDef if there's no next level defined.
    getLevelDef(category, nextLevel);
    building.targetLevel = nextLevel;
    building.state = "underConstruction";
    building.constructionProgressDays = 0;
  }

  /** Advances construction by `days` in-game days; flips to "complete" when the level's requirement is met. */
  advanceConstruction(buildingId: BuildingId, days: number): void {
    const building = this.buildings.get(buildingId);
    if (!building || building.state !== "underConstruction") return;
    building.constructionProgressDays += days;
    const levelDef = getLevelDef(building.categoryId, building.targetLevel);
    if (building.constructionProgressDays >= levelDef.constructionDays) {
      building.level = building.targetLevel;
      building.state = "complete";
      building.constructionProgressDays = 0;
    }
  }

  moveInResident(buildingId: BuildingId, npcId: NpcId, status: OccupancyStatus, rentPerWeek?: number): void {
    const building = this.buildings.get(buildingId);
    if (!building) throw new Error(`Unknown building ${buildingId}`);
    if (!building.occupancy.residents.includes(npcId)) {
      building.occupancy.residents.push(npcId);
    }
    building.occupancy.status = status;
    if (rentPerWeek !== undefined) building.occupancy.rentPerWeek = rentPerWeek;
  }

  moveOutResident(buildingId: BuildingId, npcId: NpcId): void {
    const building = this.buildings.get(buildingId);
    if (!building) return;
    building.occupancy.residents = building.occupancy.residents.filter((id) => id !== npcId);
    if (building.occupancy.residents.length === 0) building.occupancy.status = "vacant";
  }

  setOperator(buildingId: BuildingId, npcId: NpcId | null): void {
    const building = this.buildings.get(buildingId);
    if (!building) throw new Error(`Unknown building ${buildingId}`);
    building.occupancy.operatorId = npcId;
  }

  /** Begins demolition; the building and its plot's buildingId are removed once demolition completes. */
  demolish(buildingId: BuildingId): void {
    const building = this.buildings.get(buildingId);
    if (!building) return;
    building.state = "demolishing";
    building.constructionProgressDays = 0;
  }

  advanceDemolition(buildingId: BuildingId, days: number, daysRequired = 1): void {
    const building = this.buildings.get(buildingId);
    if (!building || building.state !== "demolishing") return;
    building.constructionProgressDays += days;
    if (building.constructionProgressDays >= daysRequired) {
      const plot = this.plots.get(building.plotId);
      if (plot) plot.buildingId = null;
      this.buildings.delete(building.id);
    }
  }

  toJSON(): PropertySaveData {
    return {
      plots: this.allPlots(),
      buildings: this.allBuildings(),
      nextBuildingSeq: this.nextBuildingSeq,
    };
  }

  static fromJSON(data: PropertySaveData): PropertyRegistry {
    const registry = new PropertyRegistry();
    for (const plot of data.plots) registry.plots.set(plot.id, plot);
    for (const building of data.buildings) registry.buildings.set(building.id, building);
    registry.nextBuildingSeq = data.nextBuildingSeq;
    return registry;
  }
}
