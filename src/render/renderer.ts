import { getLevelDef } from "../data/buildingDefs";
import type { Simulation } from "../sim/simulation";
import type { Camera } from "./camera";
import type { AssetLoader } from "./assets";
import { buildingSpriteKey, npcSpriteKey, PROP_SPRITE_KEYS } from "./spriteManifest";

const GROUND_Y = 260;
const PROP_SPACING = 320;
const CHARACTER_TARGET_HEIGHT = 52;
const PROP_TARGET_HEIGHT = 34;

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0 = deep night, 1 = full day. Rough sinusoidal day/night curve from the clock's 0-1 day progress. */
function daylightAmount(dayProgress: number): number {
  const angle = (dayProgress - 0.25) * Math.PI * 2;
  return Math.max(0, Math.sin(angle));
}

/**
 * Draws the world every frame. Every element checks the AssetLoader first
 * and falls back to a procedurally-drawn placeholder when the matching
 * sprite file isn't present yet — see spriteManifest.ts and
 * public/sprites/README.md. This means the game is fully playable with no
 * art at all, and each sprite upgrades independently the moment its file
 * shows up: no renderer changes needed to "install" art.
 */
export class Renderer {
  private animClockMs = 0;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private assets: AssetLoader,
  ) {}

  render(sim: Simulation, camera: Camera, playerX: number, deltaMs: number, playerLabel = "You"): void {
    this.animClockMs += deltaMs;
    const ctx = this.ctx;
    const { width, height } = ctx.canvas;
    const light = daylightAmount(sim.clock.dayProgress());

    this.drawSky(width, height, light);
    this.drawRuinedBackdrop(camera, width);
    this.drawGround(camera, width);
    this.drawProps(camera, width);

    for (const plot of sim.property.allPlots()) {
      if (!camera.isVisible(plot.x + plot.width / 2, plot.width)) continue;
      this.drawPlot(sim, plot, camera);
    }

    for (const npc of sim.npcs.active()) {
      if (!camera.isVisible(npc.x)) continue;
      const moving = npc.currentAction.targetX !== undefined && npc.currentAction.targetX !== npc.x;
      this.drawCharacter(npc.x, npc.name, npcSpriteKey(npc.id), hashColor(npc.id), camera, moving, false);
    }

    this.drawCharacter(playerX, playerLabel, "player", "#ffd93d", camera, true, true);

    this.drawNightOverlay(width, height, light);
  }

  private frameIndex(frameCount: number, frameDurationMs: number, animating: boolean): number {
    if (!animating || frameCount <= 1) return 0;
    return Math.floor(this.animClockMs / frameDurationMs) % frameCount;
  }

  private drawSky(width: number, height: number, light: number): void {
    const ctx = this.ctx;
    const topDay = [120, 170, 220];
    const topNight = [10, 12, 30];
    const bottomDay = [210, 225, 235];
    const bottomNight = [30, 30, 55];
    const top = topDay.map((c, i) => lerp(topNight[i]!, c, light));
    const bottom = bottomDay.map((c, i) => lerp(bottomNight[i]!, c, light));
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgb(${top.join(",")})`);
    gradient.addColorStop(1, `rgb(${bottom.join(",")})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /** Faint ruined skyline in the far background, as a constant reminder of the old world. */
  private drawRuinedBackdrop(camera: Camera, width: number): void {
    const ctx = this.ctx;
    const ruinKeys = ["backdrop.ruin0", "backdrop.ruin1", "backdrop.ruin2"];
    const parallax = camera.x * 0.2;
    const targetHeight = 100;
    const firstSprite = this.assets.get(ruinKeys[0]!);
    // Tile edge-to-edge at the sprite's own (scaled) width when art is loaded; fall back to a fixed spacing for the procedural placeholder.
    const spacing = firstSprite ? (firstSprite.frameWidth * targetHeight) / firstSprite.frameHeight : 220;

    ctx.save();
    ctx.globalAlpha = 0.85;
    for (let i = -1; i < Math.ceil(width / spacing) + 2; i++) {
      const bx = i * spacing - (parallax % spacing);
      const key = ruinKeys[Math.abs(i) % ruinKeys.length]!;
      const sprite = this.assets.get(key);
      if (sprite) {
        const scale = targetHeight / sprite.frameHeight;
        const targetWidth = sprite.frameWidth * scale;
        ctx.drawImage(sprite.image, 0, 0, sprite.frameWidth, sprite.frameHeight, bx, GROUND_Y - targetHeight, targetWidth, targetHeight);
      } else {
        ctx.fillStyle = "rgba(40, 42, 58, 0.55)";
        const bh = 60 + ((i * 37) % 70);
        ctx.fillRect(bx, GROUND_Y - bh, 70, bh);
        ctx.fillRect(bx + 10, GROUND_Y - bh - 14, 18, 14);
      }
    }
    ctx.restore();
    ctx.fillStyle = "rgba(40, 42, 58, 0.3)";
    ctx.fillRect(0, GROUND_Y - 4, width, 4);
  }

  private drawGround(camera: Camera, width: number): void {
    const ctx = this.ctx;
    const sprite = this.assets.get("ground.sidewalk");
    if (sprite) {
      const scale = 40 / sprite.frameHeight;
      const tileWidth = sprite.frameWidth * scale;
      const offset = camera.x % tileWidth;
      for (let x = -offset; x < width; x += tileWidth) {
        ctx.drawImage(sprite.image, 0, 0, sprite.frameWidth, sprite.frameHeight, x, GROUND_Y, tileWidth, 40);
      }
      return;
    }
    ctx.fillStyle = "#4d4f57";
    ctx.fillRect(0, GROUND_Y, width, 46);
    ctx.fillStyle = "#3a3c42";
    for (let x = 0; x < width; x += 40) {
      ctx.fillRect(x, GROUND_Y + 2, 26, 2);
    }
  }

  /** Purely decorative streetscape (lamps, benches, trash cans...) at fixed world intervals — not tied to sim data. */
  private drawProps(camera: Camera, width: number): void {
    const ctx = this.ctx;
    const firstIndex = Math.floor(camera.x / PROP_SPACING) - 1;
    const lastIndex = Math.ceil((camera.x + width) / PROP_SPACING) + 1;
    for (let i = firstIndex; i <= lastIndex; i++) {
      const worldX = i * PROP_SPACING + PROP_SPACING / 2;
      const screenX = camera.worldToScreen(worldX);
      const key = PROP_SPRITE_KEYS[Math.abs(i) % PROP_SPRITE_KEYS.length]!;
      const sprite = this.assets.get(key);
      if (sprite) {
        const scale = PROP_TARGET_HEIGHT / sprite.frameHeight;
        const targetWidth = sprite.frameWidth * scale;
        ctx.drawImage(
          sprite.image,
          0,
          0,
          sprite.frameWidth,
          sprite.frameHeight,
          screenX - targetWidth / 2,
          GROUND_Y - PROP_TARGET_HEIGHT,
          targetWidth,
          PROP_TARGET_HEIGHT,
        );
      } else {
        ctx.fillStyle = "rgba(120, 130, 110, 0.5)";
        ctx.fillRect(screenX - 2, GROUND_Y - PROP_TARGET_HEIGHT, 4, PROP_TARGET_HEIGHT);
      }
    }
  }

  private drawPlot(sim: Simulation, plot: { x: number; width: number; buildingId: string | null }, camera: Camera): void {
    const ctx = this.ctx;
    const screenX = camera.worldToScreen(plot.x);
    const centerX = screenX + plot.width / 2;
    const building = plot.buildingId ? sim.property.getBuilding(plot.buildingId) : undefined;

    if (!building) {
      const sprite = this.assets.get("building.emptyLot");
      if (sprite) {
        this.drawFixedWidth(sprite, centerX, plot.width - 20);
      } else {
        ctx.fillStyle = "#5a4a38";
        ctx.fillRect(screenX + 4, GROUND_Y - 4, plot.width - 8, 4);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.font = "10px monospace";
        ctx.fillText("empty lot", screenX + 10, GROUND_Y - 10);
      }
      return;
    }

    if (building.state === "demolishing") {
      const sprite = this.assets.get("building.demolishing");
      if (sprite) {
        this.drawFixedWidth(sprite, centerX, plot.width - 20);
      } else {
        ctx.fillStyle = "#8a7a3a";
        ctx.fillRect(screenX + 8, GROUND_Y - 40, plot.width - 16, 40);
        ctx.strokeStyle = "#ffcc00";
        ctx.strokeRect(screenX + 8, GROUND_Y - 40, plot.width - 16, 40);
      }
      return;
    }

    if (building.state === "underConstruction") {
      const levelDef = getLevelDef(building.categoryId, building.targetLevel);
      const progress = Math.min(1, building.constructionProgressDays / levelDef.constructionDays);
      const sprite = this.assets.get("building.underConstruction");
      if (sprite) {
        this.drawFixedWidth(sprite, centerX, plot.width - 20, progress);
      } else {
        const fullHeight = 30 + building.targetLevel * 14;
        const height = Math.max(8, fullHeight * progress);
        ctx.fillStyle = "#8a6d3a";
        ctx.fillRect(screenX + 12, GROUND_Y - height, plot.width - 24, height);
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX + 12, GROUND_Y - height, plot.width - 24, height);
        ctx.fillStyle = "#ffcc00";
        ctx.font = "9px monospace";
        ctx.fillText("UNDER CONSTRUCTION", screenX + 8, GROUND_Y - fullHeight - 8);
      }
      return;
    }

    const levelDef = getLevelDef(building.categoryId, building.level);
    const spriteKey = buildingSpriteKey(building.categoryId, building.level);
    const sprite = this.assets.get(spriteKey);
    const targetWidth = plot.width - 20;

    let renderedHeight: number;
    if (sprite) {
      this.drawFixedWidth(sprite, centerX, targetWidth);
      renderedHeight = sprite.frameHeight * (targetWidth / sprite.frameWidth);
    } else {
      this.drawBuildingFallback(building.categoryId, building.level, screenX, plot.width, sim.clock.isNight());
      renderedHeight = 30 + building.level * 16;
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "9px monospace";
    ctx.fillText(`${levelDef.name} (L${building.level})`, screenX + 6, GROUND_Y - renderedHeight - 6);
  }

  private drawBuildingFallback(categoryId: string, level: number, screenX: number, plotWidth: number, isNight: boolean): void {
    const ctx = this.ctx;
    const baseColors: Record<string, string> = {
      house: "#7fbf7f",
      generalStore: "#7fa8d9",
      clinic: "#e0e0e8",
    };
    const color = baseColors[categoryId] ?? "#aaaaaa";
    const height = 30 + level * 16;
    const bx = screenX + 10;
    const bw = plotWidth - 20;
    const by = GROUND_Y - height;

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(bx + 3, GROUND_Y - 4, bw, 4);

    ctx.fillStyle = color;
    ctx.fillRect(bx, by, bw, height);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(bx, by, bw, 4);

    ctx.fillStyle = isNight ? "#ffe89a" : "#2c3e50";
    const windowRows = Math.max(1, level - 1);
    for (let row = 0; row < windowRows; row++) {
      ctx.fillRect(bx + 6, by + 8 + row * 16, 10, 10);
      ctx.fillRect(bx + bw - 16, by + 8 + row * 16, 10, 10);
    }

    ctx.fillStyle = "#3a2a1e";
    ctx.fillRect(bx + bw / 2 - 6, GROUND_Y - 18, 12, 18);
  }

  /** Draws a sprite scaled to an exact footprint width (buildings/lots), optionally clipped from the bottom to show construction progress. */
  private drawFixedWidth(
    sprite: { image: CanvasImageSource; frameWidth: number; frameHeight: number },
    centerX: number,
    targetWidth: number,
    revealFromBottom = 1,
  ): void {
    const ctx = this.ctx;
    const scale = targetWidth / sprite.frameWidth;
    const fullHeight = sprite.frameHeight * scale;
    const visibleHeight = fullHeight * revealFromBottom;
    const dx = centerX - targetWidth / 2;
    const dy = GROUND_Y - visibleHeight;
    const sy = sprite.frameHeight * (1 - revealFromBottom);
    const sh = sprite.frameHeight * revealFromBottom;
    ctx.drawImage(sprite.image, 0, sy, sprite.frameWidth, sh, dx, dy, targetWidth, visibleHeight);
  }

  private drawCharacter(
    worldX: number,
    label: string,
    spriteKey: string,
    fallbackColor: string,
    camera: Camera,
    moving: boolean,
    isPlayer: boolean,
  ): void {
    const ctx = this.ctx;
    const screenX = camera.worldToScreen(worldX);
    const y = GROUND_Y;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(screenX, y + 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    const sprite = this.assets.get(spriteKey);
    if (sprite) {
      const scale = CHARACTER_TARGET_HEIGHT / sprite.frameHeight;
      const targetWidth = sprite.frameWidth * scale;
      const frame = this.frameIndex(sprite.frameCount, sprite.frameDurationMs, moving);
      const sx = frame * sprite.frameWidth;
      ctx.drawImage(
        sprite.image,
        sx,
        0,
        sprite.frameWidth,
        sprite.frameHeight,
        screenX - targetWidth / 2,
        y - CHARACTER_TARGET_HEIGHT,
        targetWidth,
        CHARACTER_TARGET_HEIGHT,
      );
    } else {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(screenX - 4, y - 22, 8, 16);
      ctx.beginPath();
      ctx.arc(screenX, y - 26, 5, 0, Math.PI * 2);
      ctx.fill();
      if (isPlayer) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - 5, y - 23, 10, 18);
      }
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, screenX, y - CHARACTER_TARGET_HEIGHT - 8);
    ctx.textAlign = "left";
  }

  private drawNightOverlay(width: number, height: number, light: number): void {
    const ctx = this.ctx;
    const darkness = 1 - light;
    if (darkness <= 0.02) return;
    ctx.fillStyle = `rgba(10, 12, 40, ${darkness * 0.45})`;
    ctx.fillRect(0, 0, width, height);
  }
}
