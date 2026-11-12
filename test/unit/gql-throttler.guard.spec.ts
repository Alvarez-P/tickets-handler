import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { ThrottlerGuard, ThrottlerStorageService } from "@nestjs/throttler";
import { GqlThrottlerGuard } from "../../src/infrastructure/inbound/rate-limit/gql-throttler.guard";

class Probe extends GqlThrottlerGuard {
  exchange(context: ExecutionContext) {
    return this.getRequestResponse(context);
  }
}

const guard = () => new Probe({ throttlers: [{ ttl: 1000, limit: 1 }] }, new ThrottlerStorageService(), new Reflector());

describe("GqlThrottlerGuard", () => {
  const req = { ip: "1.1.1.1" };
  const res = { header: () => undefined };

  it("extends ThrottlerGuard", () => {
    expect(guard()).toBeInstanceOf(ThrottlerGuard);
  });

  it("reads req and res from the http context", () => {
    const context = {
      getType: () => "http",
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;

    expect(guard().exchange(context)).toEqual({ req, res });
  });

  it("reads req and res from the graphql context", () => {
    const context = { getType: () => "graphql" } as unknown as ExecutionContext;
    const spy = vi.spyOn(GqlExecutionContext, "create").mockReturnValue({
      getContext: () => ({ req, res }),
    } as unknown as GqlExecutionContext);

    expect(guard().exchange(context)).toEqual({ req, res });
    spy.mockRestore();
  });
});
