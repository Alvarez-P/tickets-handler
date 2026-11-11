import { applyDecorators } from "@nestjs/common";
import { ApiBody, ApiQuery } from "@nestjs/swagger";
import { z } from "zod";

type OpenApiSchema = Extract<Parameters<typeof ApiBody>[0], { schema: unknown }>["schema"];

interface ObjectJsonSchema {
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
}

const toOpenApi = (schema: z.ZodType): OpenApiSchema => {
  const { $schema: _dialect, ...openApi } = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" });
  return openApi as OpenApiSchema;
};

export const ApiZodBody = (schema: z.ZodType): MethodDecorator => ApiBody({ schema: toOpenApi(schema) });

export const ApiZodQuery = (schema: z.ZodType): MethodDecorator => {
  const { properties = {}, required = [] } = toOpenApi(schema) as ObjectJsonSchema;
  return applyDecorators(
    ...Object.entries(properties).map(([name, property]) =>
      ApiQuery({ name, schema: property, required: required.includes(name) }),
    ),
  );
};
