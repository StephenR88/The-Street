/**
 * Simulation clock. Everything about "when" in the game — NPC schedules,
 * construction progress, need decay, business hours — reads time from here
 * rather than wall-clock time, so the whole sim can be paused, sped up, or
 * fast-forwarded (e.g. overnight) without touching any other system.
 */

export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;

export interface SimTime {
  /** Total simulated minutes elapsed since game start. */
  totalMinutes: number;
  day: number;
  hour: number;
  minute: number;
}

export type ClockSpeed = 0 | 1 | 2 | 4 | 8;

export interface ClockSaveData {
  totalMinutes: number;
  speed: ClockSpeed;
}

export class Clock {
  private totalMinutes = 0;
  private speed: ClockSpeed = 1;
  /** Real-time accumulator so speed is decoupled from frame rate. */
  private realMsAccumulator = 0;
  /** How many real ms correspond to one sim minute at speed=1. */
  private readonly msPerSimMinuteAtSpeed1: number;

  constructor(msPerSimMinuteAtSpeed1 = 600) {
    this.msPerSimMinuteAtSpeed1 = msPerSimMinuteAtSpeed1;
  }

  /** Advances the clock by real elapsed ms; returns how many whole sim minutes ticked. */
  advance(realDeltaMs: number): number {
    if (this.speed === 0) return 0;
    this.realMsAccumulator += realDeltaMs * this.speed;
    const msPerMinute = this.msPerSimMinuteAtSpeed1;
    let ticked = 0;
    while (this.realMsAccumulator >= msPerMinute) {
      this.realMsAccumulator -= msPerMinute;
      this.totalMinutes += 1;
      ticked += 1;
    }
    return ticked;
  }

  /** Jumps time forward instantly (e.g. sleeping through the night). */
  skipMinutes(minutes: number): void {
    this.totalMinutes += minutes;
  }

  setSpeed(speed: ClockSpeed): void {
    this.speed = speed;
  }

  getSpeed(): ClockSpeed {
    return this.speed;
  }

  now(): SimTime {
    const day = Math.floor(this.totalMinutes / MINUTES_PER_DAY);
    const minuteOfDay = this.totalMinutes % MINUTES_PER_DAY;
    const hour = Math.floor(minuteOfDay / MINUTES_PER_HOUR);
    const minute = minuteOfDay % MINUTES_PER_HOUR;
    return { totalMinutes: this.totalMinutes, day, hour, minute };
  }

  /** 0 = midnight, 1 = noon, 0..1..0 sinusoidal-ish for lighting. */
  dayProgress(): number {
    const minuteOfDay = this.totalMinutes % MINUTES_PER_DAY;
    return minuteOfDay / MINUTES_PER_DAY;
  }

  isNight(): boolean {
    const { hour } = this.now();
    return hour < 6 || hour >= 20;
  }

  toJSON(): ClockSaveData {
    return { totalMinutes: this.totalMinutes, speed: this.speed };
  }

  static fromJSON(data: ClockSaveData, msPerSimMinuteAtSpeed1 = 600): Clock {
    const clock = new Clock(msPerSimMinuteAtSpeed1);
    clock.totalMinutes = data.totalMinutes;
    clock.speed = data.speed;
    return clock;
  }
}

export function formatTime(time: SimTime): string {
  const h = time.hour.toString().padStart(2, "0");
  const m = time.minute.toString().padStart(2, "0");
  return `Day ${time.day + 1}, ${h}:${m}`;
}
