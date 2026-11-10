import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string>();

export const correlationContext = {
  get: (): string | undefined => storage.getStore(),
  run: <TResult>(correlationId: string, callback: () => TResult): TResult => storage.run(correlationId, callback),
};
