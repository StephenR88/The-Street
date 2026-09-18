import type { RNG } from "../../core/RNG";
import type { TownSnapshot } from "./town";

/** Base probability per in-game day that a new resident considers moving to town, before attraction scaling. */
const BASE_DAILY_CHANCE = 0.1;

/**
 * Framework-only immigration check for the prototype: rolls whether an
 * outsider wants to move in today. Actual placement (which vacant housing
 * slot they take) is decided by the caller, since that requires the
 * PropertyRegistry. Gated on there being anywhere to put someone at all —
 * later this is where "an entrepreneur builds apartments" would loosen the
 * gate instead of blocking immigration outright.
 */
export function rollForImmigration(rng: RNG, snapshot: TownSnapshot): boolean {
  if (snapshot.housingVacancySlots <= 0) return false;
  const chance = BASE_DAILY_CHANCE * (snapshot.attraction / 100);
  return rng.bool(chance);
}
