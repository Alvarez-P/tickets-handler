import { Specialty } from "../../../domain/entities/specialty";
import { ActiveSpecialtyExistsForType, SpecialtyNotFound } from "../../../domain/errors/staff-errors";
import { SpecialtyRepository } from "../../../domain/repositories/specialty.repository";
import { UseCase } from "../../../shared/contracts/use-case";

export interface SetSpecialtyActiveInput {
  id: string;
  active: boolean;
}

export class SetSpecialtyActive implements UseCase<SetSpecialtyActiveInput, Specialty> {
  constructor(private readonly specialties: SpecialtyRepository) {}

  async execute({ id, active }: SetSpecialtyActiveInput): Promise<Specialty> {
    const specialty = await this.specialties.findById(id);
    if (specialty === null) {
      throw new SpecialtyNotFound();
    }
    if (active && !specialty.active) {
      const current = await this.specialties.findActiveByTicketType(specialty.ticketType);
      if (current !== null && current.id !== id) {
        throw new ActiveSpecialtyExistsForType(specialty.ticketType);
      }
    }
    return this.specialties.save({ ...specialty, active });
  }
}
