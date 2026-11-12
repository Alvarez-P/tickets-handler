import { randomUUID } from "node:crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { correlationContext } from "../../../shared/observability/correlation-context";

export const CORRELATION_HEADER = "x-correlation-id";

export interface CorrelatedRequest {
  headers: Record<string, string | string[] | undefined>;
}

export interface CorrelatedResponse {
  setHeader(name: string, value: string): unknown;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: CorrelatedRequest, response: CorrelatedResponse, next: () => void): void {
    const incoming = request.headers[CORRELATION_HEADER];
    const correlationId = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
    response.setHeader(CORRELATION_HEADER, correlationId);
    correlationContext.run(correlationId, next);
  }
}
