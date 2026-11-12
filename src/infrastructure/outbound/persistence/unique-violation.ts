interface PostgresErrorShape {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
}

const UNIQUE_VIOLATION = "23505";

const isShape = (value: unknown): value is PostgresErrorShape => typeof value === "object" && value !== null;

export const violatedUniqueConstraint = (error: unknown): string | undefined => {
  if (!isShape(error)) {
    return undefined;
  }
  if (error.code === UNIQUE_VIOLATION && typeof error.constraint === "string") {
    return error.constraint;
  }
  return violatedUniqueConstraint(error.cause);
};
