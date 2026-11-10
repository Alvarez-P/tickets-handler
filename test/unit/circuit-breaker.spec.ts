import { CircuitBreaker, CircuitOpenError, CircuitState } from "../../src/shared/utils/circuit-breaker";

const fail = async (): Promise<never> => {
  throw new Error("down");
};

const succeed = async (): Promise<string> => "ok";

describe("CircuitBreaker", () => {
  const setup = (overrides = {}) => {
    const clock = { time: 0 };
    const changes: string[] = [];
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 1_000,
      now: () => clock.time,
      onStateChange: (from: CircuitState, to: CircuitState) => changes.push(`${from}->${to}`),
      ...overrides,
    });
    return { breaker, clock, changes };
  };

  it("opens after the failure threshold and rejects calls", async () => {
    const { breaker, changes } = setup();

    await expect(breaker.execute(fail)).rejects.toThrow("down");
    await expect(breaker.execute(fail)).rejects.toThrow("down");
    await expect(breaker.execute(succeed)).rejects.toThrow(CircuitOpenError);

    expect(breaker.state).toBe("open");
    expect(changes).toEqual(["closed->open"]);
  });

  it("closes again after a successful probe once the timeout elapses", async () => {
    const { breaker, clock, changes } = setup();
    await expect(breaker.execute(fail)).rejects.toThrow();
    await expect(breaker.execute(fail)).rejects.toThrow();

    clock.time = 1_000;
    expect(breaker.state).toBe("half-open");
    await expect(breaker.execute(succeed)).resolves.toBe("ok");

    expect(breaker.state).toBe("closed");
    expect(changes).toEqual(["closed->open", "open->half-open", "half-open->closed"]);
  });

  it("reopens when the probe fails", async () => {
    const { breaker, clock } = setup();
    await expect(breaker.execute(fail)).rejects.toThrow();
    await expect(breaker.execute(fail)).rejects.toThrow();

    clock.time = 1_000;
    await expect(breaker.execute(fail)).rejects.toThrow("down");

    expect(breaker.state).toBe("open");
  });

  it("ignores errors that are not counted as failures", async () => {
    const { breaker } = setup({ isFailure: () => false });

    await expect(breaker.execute(fail)).rejects.toThrow();
    await expect(breaker.execute(fail)).rejects.toThrow();

    expect(breaker.state).toBe("closed");
  });

  it("allows a single probe at a time while half-open", async () => {
    const { breaker, clock } = setup();
    await expect(breaker.execute(fail)).rejects.toThrow();
    await expect(breaker.execute(fail)).rejects.toThrow();
    clock.time = 1_000;

    const slow = breaker.execute(() => new Promise<string>((resolve) => setTimeout(() => resolve("slow"), 10)));

    await expect(breaker.execute(succeed)).rejects.toThrow(CircuitOpenError);
    await expect(slow).resolves.toBe("slow");
  });
});
