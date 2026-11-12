import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JoseTokenService } from "../../src/infrastructure/outbound/security/jose-token-service";
import { JwtAuthGuard } from "../../src/infrastructure/inbound/http/auth/jwt-auth.guard";
import { durationToSeconds } from "../../src/shared/utils/duration";

const tokens = new JoseTokenService("test-secret-test-secret-test-secret-1234");
const guard = new JwtAuthGuard(tokens);

const httpContext = (request: object): ExecutionContext =>
  ({ getType: () => "http", switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

const graphqlContext = (request: object): ExecutionContext =>
  ({ getType: () => "graphql", getClass: () => Object, getHandler: () => Object, getArgs: () => [undefined, undefined, { req: request }, undefined] }) as unknown as ExecutionContext;

describe("JwtAuthGuard", () => {
  it.each([
    ["http", httpContext],
    ["graphql", graphqlContext],
  ])("sets claims from a bearer token on %s requests", async (_type, contextFor) => {
    const request: { headers: { authorization: string }; claims?: unknown } = {
      headers: { authorization: `Bearer ${await tokens.sign({ sub: "1", roles: ["admin"] })}` },
    };

    expect(await guard.canActivate(contextFor(request))).toBe(true);
    expect(request.claims).toEqual({ sub: "1", roles: ["admin"] });
  });

  it.each([
    ["http", httpContext],
    ["graphql", graphqlContext],
  ])("rejects missing tokens on %s requests", async (_type, contextFor) => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("durationToSeconds", () => {
  it("converts jose-style durations", () => {
    expect(durationToSeconds("15m")).toBe(900);
    expect(durationToSeconds("2h")).toBe(7200);
    expect(() => durationToSeconds("soon")).toThrow();
  });
});
