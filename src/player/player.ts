const WALK_SPEED_PX_PER_SEC = 120;

/**
 * The player follows the same "position in the world" concept NPCs do, but
 * is driven by input rather than the decision system. Keeping it this
 * simple for now; interaction (talk to NPC, enter building) hooks in once
 * buildings/interiors exist.
 */
export class PlayerController {
  x: number;
  private left = false;
  private right = false;

  constructor(startX: number) {
    this.x = startX;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") this.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") this.right = true;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") this.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") this.right = false;
  };

  update(realDeltaMs: number, minX: number, maxX: number): void {
    const dx = ((this.right ? 1 : 0) - (this.left ? 1 : 0)) * WALK_SPEED_PX_PER_SEC * (realDeltaMs / 1000);
    this.x = Math.max(minX, Math.min(maxX, this.x + dx));
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
