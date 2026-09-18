import type { NPC, NpcId, NpcSaveData } from "./npc";

/** Owns all NPC data. Systems mutate NPCs through this registry so lookups stay centralized. */
export class NpcRegistry {
  private npcs = new Map<NpcId, NPC>();
  private nextSeq = 1;

  add(npc: NPC): void {
    this.npcs.set(npc.id, npc);
  }

  nextId(): string {
    return `npc_${this.nextSeq++}`;
  }

  get(id: NpcId): NPC | undefined {
    return this.npcs.get(id);
  }

  all(): NPC[] {
    return [...this.npcs.values()];
  }

  active(): NPC[] {
    return this.all().filter((n) => n.active);
  }

  toJSON(): NpcSaveData {
    return { npcs: this.all(), nextNpcSeq: this.nextSeq };
  }

  static fromJSON(data: NpcSaveData): NpcRegistry {
    const registry = new NpcRegistry();
    for (const npc of data.npcs) registry.npcs.set(npc.id, npc);
    registry.nextSeq = data.nextNpcSeq;
    return registry;
  }
}
