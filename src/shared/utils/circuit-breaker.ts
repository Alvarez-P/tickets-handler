export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  resetTimeoutMs?: number;
  isFailure?: (error: unknown) => boolean;
  now?: () => number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitOpenError extends Error {
  constructor() {
    super("El circuito está abierto");
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private current: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private openedAt = 0;
  private probing = false;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly isFailure: (error: unknown) => boolean;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 1;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.isFailure = options.isFailure ?? (() => true);
    this.now = options.now ?? Date.now;
  }

  get state(): CircuitState {
    this.refresh();
    return this.current;
  }

  async execute<TResult>(task: () => Promise<TResult>): Promise<TResult> {
    this.refresh();
    if (this.current === "open" || (this.current === "half-open" && this.probing)) {
      throw new CircuitOpenError();
    }
    const isProbe = this.current === "half-open";
    this.probing = isProbe;
    try {
      const result = await task();
      this.recordSuccess();
      return result;
    } catch (error) {
      if (this.isFailure(error)) {
        this.recordFailure();
      }
      throw error;
    } finally {
      if (isProbe) {
        this.probing = false;
      }
    }
  }

  reset(): void {
    this.transition("closed");
  }

  private refresh(): void {
    if (this.current === "open" && this.now() - this.openedAt >= this.resetTimeoutMs) {
      this.transition("half-open");
    }
  }

  private recordSuccess(): void {
    if (this.current === "half-open") {
      this.successes += 1;
      if (this.successes >= this.successThreshold) {
        this.transition("closed");
      }
      return;
    }
    this.failures = 0;
  }

  private recordFailure(): void {
    if (this.current === "half-open") {
      this.transition("open");
      return;
    }
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.transition("open");
    }
  }

  private transition(next: CircuitState): void {
    const previous = this.current;
    this.current = next;
    this.failures = 0;
    this.successes = 0;
    this.openedAt = next === "open" ? this.now() : 0;
    if (previous !== next) {
      this.options.onStateChange?.(previous, next);
    }
  }
}
