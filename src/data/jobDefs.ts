/**
 * Job definitions. A job belongs to a building category (the general store
 * hires "shopkeeper"s, the clinic hires "healer"s) and defines the wage and
 * work hours used by NPC schedules and the economy system.
 */
export interface JobDef {
  id: string;
  title: string;
  buildingCategory: string;
  baseWage: number; // Credits per hour
  startHour: number;
  endHour: number;
}

export const JOBS: readonly JobDef[] = [
  { id: "shopkeeper", title: "Shopkeeper", buildingCategory: "generalStore", baseWage: 12, startHour: 8, endHour: 17 },
  { id: "storeClerk", title: "Store Clerk", buildingCategory: "generalStore", baseWage: 9, startHour: 9, endHour: 18 },
  { id: "healer", title: "Clinic Healer", buildingCategory: "clinic", baseWage: 16, startHour: 8, endHour: 16 },
  { id: "clinicAssistant", title: "Clinic Assistant", buildingCategory: "clinic", baseWage: 10, startHour: 8, endHour: 16 },
] as const;

export const JOB_BY_ID: ReadonlyMap<string, JobDef> = new Map(JOBS.map((j) => [j.id, j]));

export function jobsForCategory(categoryId: string): JobDef[] {
  return JOBS.filter((j) => j.buildingCategory === categoryId);
}
