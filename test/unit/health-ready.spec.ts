import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "../../src/infrastructure/inbound/http/health.controller";

describe("GET /health/ready", () => {
  it("reports ok when every probe passes", async () => {
    const controller = new HealthController([{ name: "redis", check: async () => undefined }]);

    expect(await controller.ready()).toEqual({ status: "ok", checks: { redis: "up" } });
  });

  it("throws 503 with detail when a probe fails", async () => {
    const controller = new HealthController([
      { name: "redis", check: async () => undefined },
      { name: "kafka", check: async () => Promise.reject(new Error("down")) },
    ]);

    const failure = await controller.ready().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ServiceUnavailableException);
    expect((failure as ServiceUnavailableException).getStatus()).toBe(503);
    expect((failure as ServiceUnavailableException).getResponse()).toEqual({
      status: "unavailable",
      checks: { redis: "up", kafka: "down" },
    });
  });
});
