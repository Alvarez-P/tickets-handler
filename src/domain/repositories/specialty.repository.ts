import type { QueryableRepository } from "./queryable-repository";
import type { Specialty } from "../entities/specialty";
import type { TicketType } from "../value-objects/ticket-type";

export type SpecialtyRecord = Specialty;

export interface SpecialtyRepository extends QueryableRepository<SpecialtyRecord> {
  findActiveByTicketType(ticketType: TicketType): Promise<SpecialtyRecord | null>;
  findByCode(code: string): Promise<SpecialtyRecord | null>;
  findByIds(ids: string[]): Promise<SpecialtyRecord[]>;
}
