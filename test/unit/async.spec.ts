import { mapConcurrent, retry, sleep, withTimeout } from "../../src/shared/utils/async";

describe("async utils", () => {
  it("retries until the task succeeds", async () => {
    let calls = 0;
    const value = await retry(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw new Error("flaky");
        }
        return "done";
      },
      { attempts: 5, baseDelayMs: 1 },
    );

    expect(value).toBe("done");
    expect(calls).toBe(3);
  });

  it("stops retrying when shouldRetry says no", async () => {
    let calls = 0;
    const failing = retry(
      async () => {
        calls += 1;
        throw new Error("fatal");
      },
      { attempts: 5, baseDelayMs: 1, shouldRetry: () => false },
    );

    await expect(failing).rejects.toThrow("fatal");
    expect(calls).toBe(1);
  });

  it("rejects when the timeout elapses first", async () => {
    await expect(withTimeout(sleep(50), 5)).rejects.toThrow("Tiempo de espera agotado");
    await expect(withTimeout(Promise.resolve(1), 50)).resolves.toBe(1);
  });

  it("limits concurrency and preserves order", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapConcurrent([1, 2, 3, 4, 5], 2, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await sleep(5);
      active -= 1;
      return item * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
