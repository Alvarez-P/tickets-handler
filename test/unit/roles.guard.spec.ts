import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Roles } from "../../src/infrastructure/inbound/http/auth/roles.decorator";
import { RolesGuard } from "../../src/infrastructure/inbound/http/auth/roles.guard";

class Handlers {
  @Roles("admin")
  adminOnly(): void {}

  open(): void {}
}

const contextWith = (handler: () => void, claims: unknown): ExecutionContext =>
  ({
    getType: () => "http",
    getHandler: () => handler,
    getClass: () => Handlers,
    switchToHttp: () => ({ getRequest: () => ({ claims }) }),
  }) as unknown as ExecutionContext;

describe("RolesGuard", () => {
  const guard = new RolesGuard(new Reflector());
  const handlers = new Handlers();

  it("allows handlers without required roles", () => {
    expect(guard.canActivate(contextWith(handlers.open, undefined))).toBe(true);
  });

  it("allows a user holding a required role", () => {
    expect(guard.canActivate(contextWith(handlers.adminOnly, { sub: "1", roles: ["admin"] }))).toBe(true);
  });

  it("denies a user without the role", () => {
    expect(() => guard.canActivate(contextWith(handlers.adminOnly, { sub: "1", roles: ["support-agent"] }))).toThrow(
      ForbiddenException,
    );
  });

  it("denies when claims carry no roles", () => {
    expect(() => guard.canActivate(contextWith(handlers.adminOnly, { sub: "1" }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextWith(handlers.adminOnly, undefined))).toThrow(ForbiddenException);
  });
});
