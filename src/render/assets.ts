export interface SpriteDef {
  /** Path relative to the site root, e.g. "sprites/buildings/house_L1.png". */
  src: string;
  /** Number of horizontal frames in the sheet (1 = static image). */
  frameCount?: number;
  /** Real ms per frame when animated. */
  frameDurationMs?: number;
  /** Anchor point within the sprite, 0-1 on each axis. Default: bottom-center (0.5, 1). */
  anchor?: { x: number; y: number };
}

interface LoadedSprite {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDurationMs: number;
  anchor: { x: number; y: number };
}

/**
 * Loads sprite images declared in a manifest and exposes them once ready.
 * Every lookup degrades gracefully: a missing or not-yet-loaded file simply
 * isn't returned, so callers (the renderer) fall back to procedural
 * shapes instead of crashing. This is what lets the game ship playable
 * today and pick up real art the moment matching files appear in
 * `public/sprites/`, no code changes required.
 */
export class AssetLoader {
  private loaded = new Map<string, LoadedSprite>();
  private failed = new Set<string>();

  /** Kicks off loading every entry in the manifest. Does not need to be awaited — the renderer just won't draw a sprite until it resolves. */
  beginLoading(manifest: Record<string, SpriteDef>): void {
    for (const [key, def] of Object.entries(manifest)) {
      const image = new Image();
      image.onload = () => {
        const frameCount = def.frameCount ?? 1;
        this.loaded.set(key, {
          image,
          frameWidth: image.naturalWidth / frameCount,
          frameHeight: image.naturalHeight,
          frameCount,
          frameDurationMs: def.frameDurationMs ?? 150,
          anchor: def.anchor ?? { x: 0.5, y: 1 },
        });
      };
      image.onerror = () => {
        this.failed.add(key);
      };
      image.src = def.src;
    }
  }

  get(key: string): LoadedSprite | undefined {
    return this.loaded.get(key);
  }

  has(key: string): boolean {
    return this.loaded.has(key);
  }
}
