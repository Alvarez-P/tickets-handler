import { randomUUID } from "node:crypto";
import { Specialty } from "../../../domain/entities/specialty";
import { ActiveSpecialtyExistsForType, SpecialtyCodeTaken } from "../../../domain/errors/staff-errors";
import { SpecialtyRepository } from "../../../domain/repositories/specialty.repository";
import { TicketType } from "../../../domain/value-objects/ticket-type";
import { UseCase } from "../../use-case";

export interface CreateSpecialtyInput {
  code: string;
  name: string;
  description?: string;
  ticketType: TicketType;
  active?: boolean;
}

export class CreateSpecialty implements UseCase<CreateSpecialtyInput, Specialty> {
  constructor(private readonly specialties: SpecialtyRepository) {}

  async execute({ description = "", active = true, ...profile }: CreateSpecialtyInput): Promise<Specialty> {
    if ((await this.specialties.findByCode(profile.code)) !== null) {
      throw new SpecialtyCodeTaken(profile.code);
    }
    if (active && (await this.specialties.findActiveByTicketType(profile.ticketType)) !== null) {
      throw new ActiveSpecialtyExistsForType(profile.ticketType);
    }
    return this.specialties.save({ id: randomUUID(), ...profile, description, active });
  }
}
