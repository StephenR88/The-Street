import { JOB_BY_ID } from "../../data/jobDefs";
import type { BuildingId, NpcId } from "../property/property";

export interface EmploymentRecord {
  npcId: NpcId;
  buildingId: BuildingId;
  jobId: string;
  /** Actual wage per hour paid, which can diverge from the job's base wage (owner traits, negotiation, etc). */
  wagePerHour: number;
  hiredMinute: number;
}

export interface BusinessLedger {
  buildingId: BuildingId;
  revenue: number;
  expenses: number;
}

export interface EconomySaveData {
  wallets: [NpcId, number][];
  employment: EmploymentRecord[];
  ledgers: BusinessLedger[];
}

/**
 * Owns Credits: wallets, employment contracts, and per-business revenue/
 * expense ledgers. Deliberately knows nothing about relationships or
 * traits itself — callers (e.g. the hiring flow in Simulation) look up
 * trait-driven wage modifiers and pass the final numbers in here.
 */
export class Economy {
  private wallets = new Map<NpcId, number>();
  private employment = new Map<NpcId, EmploymentRecord>();
  private ledgers = new Map<BuildingId, BusinessLedger>();

  getBalance(npcId: NpcId): number {
    return this.wallets.get(npcId) ?? 0;
  }

  setBalance(npcId: NpcId, amount: number): void {
    this.wallets.set(npcId, amount);
  }

  deposit(npcId: NpcId, amount: number): void {
    this.wallets.set(npcId, this.getBalance(npcId) + amount);
  }

  /** Wallets are allowed to go negative (debt) rather than blocking transactions — businesses and people can go broke. */
  withdraw(npcId: NpcId, amount: number): void {
    this.wallets.set(npcId, this.getBalance(npcId) - amount);
  }

  private ledgerFor(buildingId: BuildingId): BusinessLedger {
    let ledger = this.ledgers.get(buildingId);
    if (!ledger) {
      ledger = { buildingId, revenue: 0, expenses: 0 };
      this.ledgers.set(buildingId, ledger);
    }
    return ledger;
  }

  getLedger(buildingId: BuildingId): BusinessLedger {
    return this.ledgerFor(buildingId);
  }

  /** Customer pays `amount` to the business operator; records revenue. */
  recordSale(buildingId: BuildingId, operatorId: NpcId, customerId: NpcId, amount: number): void {
    this.withdraw(customerId, amount);
    this.deposit(operatorId, amount);
    this.ledgerFor(buildingId).revenue += amount;
  }

  hire(npcId: NpcId, buildingId: BuildingId, jobId: string, wagePerHour: number, hiredMinute: number): EmploymentRecord {
    const record: EmploymentRecord = { npcId, buildingId, jobId, wagePerHour, hiredMinute };
    this.employment.set(npcId, record);
    return record;
  }

  fire(npcId: NpcId): void {
    this.employment.delete(npcId);
  }

  getEmployment(npcId: NpcId): EmploymentRecord | undefined {
    return this.employment.get(npcId);
  }

  employeesOf(buildingId: BuildingId): EmploymentRecord[] {
    return [...this.employment.values()].filter((e) => e.buildingId === buildingId);
  }

  /** Pays `minutesWorked` worth of wages from the operator's wallet to the employee, and books the expense. */
  payWages(employee: EmploymentRecord, operatorId: NpcId, minutesWorked: number): number {
    const amount = employee.wagePerHour * (minutesWorked / 60);
    this.withdraw(operatorId, amount);
    this.deposit(employee.npcId, amount);
    this.ledgerFor(employee.buildingId).expenses += amount;
    return amount;
  }

  static baseWageFor(jobId: string): number {
    return JOB_BY_ID.get(jobId)?.baseWage ?? 10;
  }

  toJSON(): EconomySaveData {
    return {
      wallets: [...this.wallets.entries()],
      employment: [...this.employment.values()],
      ledgers: [...this.ledgers.values()],
    };
  }

  static fromJSON(data: EconomySaveData): Economy {
    const economy = new Economy();
    for (const [id, amount] of data.wallets) economy.wallets.set(id, amount);
    for (const record of data.employment) economy.employment.set(record.npcId, record);
    for (const ledger of data.ledgers) economy.ledgers.set(ledger.buildingId, ledger);
    return economy;
  }
}
