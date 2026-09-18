import {
  neutralScores,
  RELATIONSHIP_DIMENSIONS,
  type Memory,
  type RelationshipDimension,
  type RelationshipEdge,
} from "./relationship";

function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

export interface RelationshipSaveData {
  edges: RelationshipEdge[];
  nextMemorySeq: number;
}

/**
 * Owns the directional relationship graph. `from -> to` and `to -> from`
 * are independent edges, so A can consider B a best friend while B barely
 * registers A — matching how the design doc wants asymmetric relationships.
 */
export class RelationshipManager {
  private edges = new Map<string, RelationshipEdge>();
  private nextMemorySeq = 1;

  private getOrCreate(from: string, to: string): RelationshipEdge {
    const key = edgeKey(from, to);
    let edge = this.edges.get(key);
    if (!edge) {
      edge = { from, to, scores: neutralScores(), memories: [] };
      this.edges.set(key, edge);
    }
    return edge;
  }

  get(from: string, to: string): RelationshipEdge | undefined {
    return this.edges.get(edgeKey(from, to));
  }

  /** Applies deltas to one or more dimensions of `from`'s feelings toward `to`. Clamped to [-100, 100]. */
  adjust(from: string, to: string, deltas: Partial<Record<RelationshipDimension, number>>): RelationshipEdge {
    const edge = this.getOrCreate(from, to);
    for (const dim of RELATIONSHIP_DIMENSIONS) {
      const delta = deltas[dim];
      if (delta === undefined) continue;
      edge.scores[dim] = Math.max(-100, Math.min(100, edge.scores[dim] + delta));
    }
    return edge;
  }

  addMemory(
    from: string,
    to: string,
    description: string,
    importance: number,
    createdMinute: number,
    effects: Partial<Record<RelationshipDimension, number>> = {},
  ): void {
    const edge = this.getOrCreate(from, to);
    const memory: Memory = {
      id: `mem_${this.nextMemorySeq++}`,
      description,
      importance: Math.max(0, Math.min(100, importance)),
      createdMinute,
      effects,
    };
    edge.memories.push(memory);
    if (Object.keys(effects).length > 0) this.adjust(from, to, effects);
  }

  /** All edges where `from` is the given NPC (what they think of everyone else). */
  outgoingFrom(from: string): RelationshipEdge[] {
    return [...this.edges.values()].filter((e) => e.from === from);
  }

  toJSON(): RelationshipSaveData {
    return { edges: [...this.edges.values()], nextMemorySeq: this.nextMemorySeq };
  }

  static fromJSON(data: RelationshipSaveData): RelationshipManager {
    const manager = new RelationshipManager();
    for (const edge of data.edges) manager.edges.set(edgeKey(edge.from, edge.to), edge);
    manager.nextMemorySeq = data.nextMemorySeq;
    return manager;
  }
}
