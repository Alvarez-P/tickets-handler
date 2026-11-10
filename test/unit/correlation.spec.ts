import { CorrelationIdMiddleware } from "../../src/infrastructure/http/correlation-id.middleware";
import { correlationContext } from "../../src/shared/observability/correlation-context";

describe("correlation", () => {
  it("exposes the id only inside run", () => {
    expect(correlationContext.get()).toBeUndefined();
    expect(correlationContext.run("abc", () => correlationContext.get())).toBe("abc");
  });

  it("reuses the incoming header and echoes it", () => {
    const headers: Record<string, string> = {};
    let seen: string | undefined;

    new CorrelationIdMiddleware().use(
      { headers: { "x-correlation-id": "req-1" } },
      { setHeader: (name, value) => (headers[name] = value) },
      () => {
        seen = correlationContext.get();
      },
    );

    expect(seen).toBe("req-1");
    expect(headers["x-correlation-id"]).toBe("req-1");
  });

  it("generates an id when the header is missing", () => {
    const headers: Record<string, string> = {};
    let seen: string | undefined;

    new CorrelationIdMiddleware().use({ headers: {} }, { setHeader: (name, value) => (headers[name] = value) }, () => {
      seen = correlationContext.get();
    });

    expect(seen).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers["x-correlation-id"]).toBe(seen);
  });
});
