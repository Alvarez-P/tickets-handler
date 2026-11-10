import { Specialty } from "../../../domain/entities/specialty";
import { SpecialtyRepository } from "../../../domain/repositories/specialty.repository";
import { Page } from "../../../shared/contracts/query";
import { UseCase } from "../../../shared/contracts/use-case";

export interface ListSpecialtiesInput {
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export class ListSpecialties implements UseCase<ListSpecialtiesInput, Page<Specialty>> {
  constructor(private readonly specialties: SpecialtyRepository) {}

  execute({ active, page, pageSize }: ListSpecialtiesInput): Promise<Page<Specialty>> {
    return this.specialties.find({
      where: active === undefined ? {} : { active },
      orderBy: { field: "code", direction: "asc" },
      page,
      pageSize,
    });
  }
}
