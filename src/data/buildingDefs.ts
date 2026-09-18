/**
 * Building category + level definitions. A plot's building references a
 * category id and a level index into that category's `levels` array.
 * New categories (arcade, apartment, school, ...) are added here later
 * without touching the property/construction systems, which only deal in
 * category ids and level numbers.
 */
export interface BuildingLevelDef {
  level: number;
  name: string;
  description: string;
  /** In-game days of visible construction to reach this level from the previous one. */
  constructionDays: number;
  /** Credits cost to build/upgrade to this level. */
  cost: number;
  /** How many residents/workers the building can hold at this level, if applicable. */
  capacity: number;
}

export interface BuildingCategoryDef {
  id: string;
  name: string;
  /** "residential" homes NPCs live in; "commercial" employs NPCs and serves customers; "civic" is town infrastructure. */
  kind: "residential" | "commercial" | "civic";
  levels: BuildingLevelDef[];
}

export const BUILDING_CATEGORIES: readonly BuildingCategoryDef[] = [
  {
    id: "house",
    name: "House",
    kind: "residential",
    levels: [
      { level: 1, name: "Basic Shelter", description: "A small, repaired shelter — patched walls, one room.", constructionDays: 2, cost: 0, capacity: 2 },
      { level: 2, name: "Small Home", description: "A modest but comfortable home.", constructionDays: 2, cost: 1200, capacity: 3 },
      { level: 3, name: "Established House", description: "A larger, well-kept house.", constructionDays: 3, cost: 3000, capacity: 4 },
      { level: 4, name: "Two-Story House", description: "A large upgraded two-story home.", constructionDays: 4, cost: 7000, capacity: 5 },
      { level: 5, name: "Luxury Residence", description: "A heavily customized, high-end home.", constructionDays: 5, cost: 15000, capacity: 6 },
    ],
  },
  {
    id: "generalStore",
    name: "General Store",
    kind: "commercial",
    levels: [
      { level: 1, name: "Storefront Stall", description: "A basic stall selling essentials.", constructionDays: 2, cost: 0, capacity: 2 },
      { level: 2, name: "General Store", description: "A proper storefront with regular stock.", constructionDays: 3, cost: 2500, capacity: 3 },
      { level: 3, name: "Expanded Store", description: "A larger store with more variety.", constructionDays: 3, cost: 6000, capacity: 4 },
    ],
  },
  {
    id: "clinic",
    name: "Clinic",
    kind: "commercial",
    levels: [
      { level: 1, name: "First Aid Post", description: "A single-room post for basic care.", constructionDays: 2, cost: 0, capacity: 2 },
      { level: 2, name: "Clinic", description: "A staffed clinic offering regular checkups.", constructionDays: 3, cost: 3000, capacity: 3 },
      { level: 3, name: "Medical Center", description: "An expanded facility with more capacity.", constructionDays: 4, cost: 8000, capacity: 5 },
    ],
  },
] as const;

export const BUILDING_CATEGORY_BY_ID: ReadonlyMap<string, BuildingCategoryDef> = new Map(
  BUILDING_CATEGORIES.map((c) => [c.id, c]),
);

export function getLevelDef(categoryId: string, level: number): BuildingLevelDef {
  const category = BUILDING_CATEGORY_BY_ID.get(categoryId);
  if (!category) throw new Error(`Unknown building category: ${categoryId}`);
  const def = category.levels.find((l) => l.level === level);
  if (!def) throw new Error(`Unknown level ${level} for category ${categoryId}`);
  return def;
}
