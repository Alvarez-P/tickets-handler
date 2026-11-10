import pino from "pino";
import { environment } from "../config/environment";
import { correlationContext } from "../observability/correlation-context";

export const logger = pino({
  level: environment.logLevel,
  mixin: () => {
    const correlationId = correlationContext.get();
    return correlationId ? { correlationId } : {};
  },
});
