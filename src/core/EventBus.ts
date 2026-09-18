/**
 * Minimal typed pub/sub so simulation modules can react to each other
 * (Economy -> Relationships, Property -> Town demand, etc.) without
 * importing one another directly. Keeps systems decoupled and lets new
 * systems subscribe to existing events instead of requiring call-site
 * changes everywhere an event originates.
 */
export type EventMap = Record<string, unknown>;

type Handler<T> = (payload: T) => void;

export class EventBus<Events extends EventMap> {
  private handlers: { [K in keyof Events]?: Set<Handler<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const set = this.handlers[event] ?? new Set();
    set.add(handler);
    this.handlers[event] = set;
    return () => set.delete(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.handlers[event];
    if (!set) return;
    // Copy to array so a handler unsubscribing mid-emit doesn't skip others.
    for (const handler of [...set]) {
      handler(payload);
    }
  }
}
