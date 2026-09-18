import { Simulation, type SimulationSaveData } from "../sim/simulation";

const SAVE_VERSION = 1;
const STORAGE_KEY = "the-street:save";

export interface SaveFile {
  version: number;
  savedAtIso: string;
  playerX: number;
  simulation: SimulationSaveData;
}

/**
 * Versioned save/load. `version` exists so future saves can detect and
 * migrate older data instead of breaking outright once systems (children,
 * crime, redevelopment, ...) add new fields to the save shape.
 */
export const SaveManager = {
  save(sim: Simulation, playerX: number): SaveFile {
    const file: SaveFile = {
      version: SAVE_VERSION,
      savedAtIso: new Date().toISOString(),
      playerX,
      simulation: sim.toJSON(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    } catch (err) {
      console.warn("Failed to persist save to localStorage", err);
    }
    return file;
  },

  load(): { sim: Simulation; playerX: number } | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Failed to read save from localStorage", err);
      return null;
    }
    if (!raw) return null;
    try {
      const file = JSON.parse(raw) as SaveFile;
      if (file.version !== SAVE_VERSION) {
        console.warn(`Save version mismatch (found ${file.version}, expected ${SAVE_VERSION}); ignoring save.`);
        return null;
      }
      return { sim: Simulation.fromJSON(file.simulation), playerX: file.playerX };
    } catch (err) {
      console.warn("Failed to parse save file", err);
      return null;
    }
  },

  hasSave(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
