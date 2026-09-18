import { getLevelDef } from "../data/buildingDefs";
import type { Simulation } from "../sim/simulation";
import type { Camera } from "./camera";

const GROUND_Y = 260;
const PLOT_FOOTPRINT_HEIGHT = 6;

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
  // dayProgress: 0 = midnight, 0.5 = noon.
  const angle = (dayProgress - 0.25) * Math.PI * 2;
  return Math.max(0, Math.sin(angle));
}

export class Renderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  render(sim: Simulation, camera: Camera, playerX: number, playerLabel = "You"): void {
    const ctx = this.ctx;
    const { width, height } = ctx.canvas;
    const light = daylightAmount(sim.clock.dayProgress());

    this.drawSky(width, height, light);
    this.drawRuinedBackdrop(camera, width);
    this.drawGround(width);

    for (const plot of sim.property.allPlots()) {
      if (!camera.isVisible(plot.x + plot.width / 2, plot.width)) continue;
      this.drawPlot(sim, plot, camera);
    }

    for (const npc of sim.npcs.active()) {
      if (!camera.isVisible(npc.x)) continue;
      this.drawNpc(npc.x, npc.name, hashColor(npc.id), camera);
    }

    this.drawNpc(playerX, playerLabel, "#ffd93d", camera, true);

    this.drawNightOverlay(width, height, light);
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
    ctx.fillStyle = "rgba(40, 42, 58, 0.55)";
    const parallax = camera.x * 0.2;
    for (let i = -1; i < 8; i++) {
      const bx = i * 220 - (parallax % 220);
      const bh = 60 + ((i * 37) % 70);
      ctx.fillRect(bx, GROUND_Y - bh, 70, bh);
      // Broken top silhouette.
      ctx.fillRect(bx + 10, GROUND_Y - bh - 14, 18, 14);
    }
    ctx.fillStyle = "rgba(40, 42, 58, 0.3)";
    ctx.fillRect(0, GROUND_Y - 4, width, 4);
  }

  private drawGround(width: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#4d4f57";
    ctx.fillRect(0, GROUND_Y, width, PLOT_FOOTPRINT_HEIGHT + 40);
    ctx.fillStyle = "#3a3c42";
    for (let x = 0; x < width; x += 40) {
      ctx.fillRect(x, GROUND_Y + 2, 26, 2);
    }
  }

  private drawPlot(sim: Simulation, plot: { x: number; width: number; buildingId: string | null }, camera: Camera): void {
    const ctx = this.ctx;
    const screenX = camera.worldToScreen(plot.x);
    const building = plot.buildingId ? sim.property.getBuilding(plot.buildingId) : undefined;

    if (!building) {
      ctx.fillStyle = "#5a4a38";
      ctx.fillRect(screenX + 4, GROUND_Y - 4, plot.width - 8, 4);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "10px monospace";
      ctx.fillText("empty lot", screenX + 10, GROUND_Y - 10);
      return;
    }

    if (building.state === "demolishing") {
      ctx.fillStyle = "#8a7a3a";
      ctx.fillRect(screenX + 8, GROUND_Y - 40, plot.width - 16, 40);
      ctx.strokeStyle = "#ffcc00";
      ctx.strokeRect(screenX + 8, GROUND_Y - 40, plot.width - 16, 40);
      return;
    }

    if (building.state === "underConstruction") {
      const levelDef = getLevelDef(building.categoryId, building.targetLevel);
      const progress = Math.min(1, building.constructionProgressDays / levelDef.constructionDays);
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
      return;
    }

    const levelDef = getLevelDef(building.categoryId, building.level);
    const baseColors: Record<string, string> = {
      house: "#7fbf7f",
      generalStore: "#7fa8d9",
      clinic: "#e0e0e8",
    };
    const color = baseColors[building.categoryId] ?? "#aaaaaa";
    const height = 30 + building.level * 16;
    const bx = screenX + 10;
    const bw = plot.width - 20;
    const by = GROUND_Y - height;

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(bx + 3, GROUND_Y - 4, bw, 4);

    ctx.fillStyle = color;
    ctx.fillRect(bx, by, bw, height);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(bx, by, bw, 4);

    // Windows, lit at night.
    const lit = sim.clock.isNight();
    ctx.fillStyle = lit ? "#ffe89a" : "#2c3e50";
    const windowRows = Math.max(1, building.level - 1);
    for (let row = 0; row < windowRows; row++) {
      ctx.fillRect(bx + 6, by + 8 + row * 16, 10, 10);
      ctx.fillRect(bx + bw - 16, by + 8 + row * 16, 10, 10);
    }

    ctx.fillStyle = "#3a2a1e";
    ctx.fillRect(bx + bw / 2 - 6, GROUND_Y - 18, 12, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "9px monospace";
    ctx.fillText(`${levelDef.name} (L${building.level})`, bx - 4, by - 6);
  }

  private drawNpc(worldX: number, label: string, color: string, camera: Camera, isPlayer = false): void {
    const ctx = this.ctx;
    const screenX = camera.worldToScreen(worldX);
    const y = GROUND_Y;

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(screenX, y + 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillRect(screenX - 4, y - 22, 8, 16);
    ctx.beginPath();
    ctx.arc(screenX, y - 26, 5, 0, Math.PI * 2);
    ctx.fill();

    if (isPlayer) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX - 5, y - 23, 10, 18);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, screenX, y - 34);
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
