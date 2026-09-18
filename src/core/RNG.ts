/**
 * Deterministic seeded RNG (mulberry32). Every procedural system (NPC
 * generation, decision jitter, town events) should pull from a RNG instance
 * rather than Math.random, so a whole playthrough is reproducible from a
 * single seed and save files can persist the generator state exactly.
 */
export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  static fromString(seed: string): RNG {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return new RNG(h >>> 0);
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max). */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("RNG.pick called with empty array");
    }
    const item = items[this.int(0, items.length - 1)];
    return item as T;
  }

  /** Picks `count` distinct items from `items` without replacement. */
  pickMany<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const result: T[] = [];
    const n = Math.min(count, pool.length);
    for (let i = 0; i < n; i++) {
      const idx = this.int(0, pool.length - 1);
      result.push(pool[idx] as T);
      pool.splice(idx, 1);
    }
    return result;
  }

  /** Returns internal state for save serialization. */
  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}
