/**
 * Tracks the horizontal scroll offset so the world can be wider than the
 * canvas. Rendering and player movement both read/write through this
 * rather than juggling raw world/screen coordinates independently.
 */
export class Camera {
  x = 0;
  constructor(
    public viewWidth: number,
    public worldWidth: number,
  ) {}

  follow(targetX: number): void {
    this.x = targetX - this.viewWidth / 2;
    this.clamp();
  }

  private clamp(): void {
    const maxX = Math.max(0, this.worldWidth - this.viewWidth);
    this.x = Math.max(0, Math.min(maxX, this.x));
  }

  worldToScreen(worldX: number): number {
    return worldX - this.x;
  }

  isVisible(worldX: number, margin = 64): boolean {
    const screenX = this.worldToScreen(worldX);
    return screenX >= -margin && screenX <= this.viewWidth + margin;
  }
}
