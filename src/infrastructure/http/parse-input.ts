import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

export const parseInput = <TSchema extends z.ZodType>(schema: TSchema, value: unknown): z.output<TSchema> => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues);
  }
  return parsed.data;
};
