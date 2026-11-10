import { and, eq, inArray } from "drizzle-orm";
import { ActiveSpecialtyExistsForType, SpecialtyCodeTaken } from "../../domain/errors/staff-errors";
import { SpecialtyRecord, SpecialtyRepository } from "../../domain/repositories/specialty.repository";
import { TicketType } from "../../domain/value-objects/ticket-type";
import { DrizzleBaseRepository } from "./drizzle-base.repository";
import { DrizzleClient } from "./drizzle-client";
import { specialties } from "./schema";
import { violatedUniqueConstraint } from "./unique-violation";

const ACTIVE_TYPE_INDEX = "specialties_active_ticket_type_idx";
const CODE_CONSTRAINT = "specialties_code_unique";

const toRecord = (row: typeof specialties.$inferSelect): SpecialtyRecord => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  ticketType: row.ticketType,
  active: row.active,
});

export class DrizzleSpecialtyRepository extends DrizzleBaseRepository<SpecialtyRecord> implements SpecialtyRepository {
  constructor(private readonly db: DrizzleClient) {
    super(db, specialties);
  }

  async save(entity: SpecialtyRecord): Promise<SpecialtyRecord> {
    try {
      return await super.save(entity);
    } catch (error) {
      const constraint = violatedUniqueConstraint(error);
      if (constraint === ACTIVE_TYPE_INDEX) {
        throw new ActiveSpecialtyExistsForType(entity.ticketType);
      }
      if (constraint === CODE_CONSTRAINT) {
        throw new SpecialtyCodeTaken(entity.code);
      }
      throw error;
    }
  }

  async findActiveByTicketType(ticketType: TicketType): Promise<SpecialtyRecord | null> {
    const [row] = await this.db
      .select()
      .from(specialties)
      .where(and(eq(specialties.ticketType, ticketType), eq(specialties.active, true)));
    return row ? toRecord(row) : null;
  }

  async findByCode(code: string): Promise<SpecialtyRecord | null> {
    const [row] = await this.db.select().from(specialties).where(eq(specialties.code, code));
    return row ? toRecord(row) : null;
  }

  async findByIds(ids: string[]): Promise<SpecialtyRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.db.select().from(specialties).where(inArray(specialties.id, ids));
    return rows.map(toRecord);
  }
}
