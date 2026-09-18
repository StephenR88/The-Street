import type { ClockSpeed } from "./core/Clock";
import { Simulation } from "./sim/simulation";
import { generateWorld, PLOT_WIDTH, PROTOTYPE_PLOT_COUNT } from "./world/worldgen";
import { Camera } from "./render/camera";
import { Renderer } from "./render/renderer";
import { AssetLoader } from "./render/assets";
import { buildManifest } from "./render/spriteManifest";
import { PlayerController } from "./player/player";
import { SaveManager } from "./save/save";
import { renderHud } from "./ui/hud";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Canvas 2D context unavailable");
const hudEl = document.getElementById("hud") as HTMLElement;

const worldWidth = PROTOTYPE_PLOT_COUNT * PLOT_WIDTH;

function newGame(): { sim: Simulation; playerX: number } {
  const seed = Math.random().toString(36).slice(2);
  const sim = new Simulation(seed);
  generateWorld(sim);
  sim.clock.setSpeed(1);
  const firstNpc = sim.npcs.all()[0];
  return { sim, playerX: firstNpc ? firstNpc.x : PLOT_WIDTH * 2 };
}

let { sim, playerX: initialPlayerX } = SaveManager.hasSave()
  ? SaveManager.load() ?? newGame()
  : newGame();

const player = new PlayerController(initialPlayerX);
const camera = new Camera(canvas.width, worldWidth);
const assets = new AssetLoader();
assets.beginLoading(buildManifest());
const renderer = new Renderer(ctx, assets);

window.addEventListener("keydown", (e) => {
  const speedKeys: Record<string, ClockSpeed> = { Digit1: 1, Digit2: 2, Digit3: 4, Digit4: 8 };
  if (e.code in speedKeys) sim.clock.setSpeed(speedKeys[e.code]!);
  if (e.code === "Space") {
    e.preventDefault();
    sim.clock.setSpeed(sim.clock.getSpeed() === 0 ? 1 : 0);
  }
  if (e.code === "KeyS") {
    SaveManager.save(sim, player.x);
    console.info("Game saved.");
  }
  if (e.code === "KeyL") {
    const loaded = SaveManager.load();
    if (loaded) {
      sim = loaded.sim;
      player.x = loaded.playerX;
      console.info("Game loaded.");
    }
  }
});

let last = performance.now();
function frame(now: number): void {
  const deltaMs = Math.min(250, now - last);
  last = now;

  player.update(deltaMs, 0, worldWidth);
  sim.playerX = player.x;
  sim.update(deltaMs);

  camera.follow(player.x);
  renderer.render(sim, camera, player.x, deltaMs);
  renderHud(hudEl, sim, player.x);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
