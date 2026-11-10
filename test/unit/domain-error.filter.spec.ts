import { ArgumentsHost } from "@nestjs/common";
import { DomainError } from "../../src/domain/errors/domain-error";
import { DomainErrorFilter, domainErrorStatuses } from "../../src/infrastructure/http/domain-error.filter";

class SampleError extends DomainError {
  readonly code = "SAMPLE";
  constructor() {
    super("sample failure");
  }
}

const hostCapturing = (captured: { status?: number; body?: unknown }): ArgumentsHost =>
  ({
    getType: () => "http",
    switchToHttp: () => ({
      getResponse: () => ({
        status: (code: number) => {
          captured.status = code;
          return { json: (body: unknown) => (captured.body = body) };
        },
      }),
    }),
  }) as unknown as ArgumentsHost;

describe("DomainErrorFilter", () => {
  afterEach(() => {
    delete domainErrorStatuses.SAMPLE;
  });

  it("defaults to 409", () => {
    const captured: { status?: number; body?: unknown } = {};

    new DomainErrorFilter().catch(new SampleError(), hostCapturing(captured));

    expect(captured).toEqual({ status: 409, body: { code: "SAMPLE", message: "sample failure" } });
  });

  it("uses the registered status", () => {
    domainErrorStatuses.SAMPLE = 404;
    const captured: { status?: number } = {};

    new DomainErrorFilter().catch(new SampleError(), hostCapturing(captured));

    expect(captured.status).toBe(404);
  });
});
