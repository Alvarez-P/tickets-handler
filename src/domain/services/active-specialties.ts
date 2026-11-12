import type { Specialty } from "../entities/specialty";
import { SpecialtyNotFound } from "../errors/staff-errors";
import type { SpecialtyRepository } from "../repositories/specialty.repository";

export const requireActiveSpecialties = async (specialties: SpecialtyRepository, ids: readonly string[]): Promise<Specialty[]> => {
  const found = await specialties.findByIds([...ids]);
  if (found.length !== ids.length || found.some((specialty) => !specialty.active)) {
    throw new SpecialtyNotFound();
  }
  return found;
};
