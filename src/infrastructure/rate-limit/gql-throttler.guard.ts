import { ExecutionContext, Injectable } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { ThrottlerGuard } from "@nestjs/throttler";

interface ThrottledExchange {
  req: Record<string, unknown>;
  res: Record<string, unknown>;
}

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext): ThrottledExchange {
    if (context.getType<string>() === "graphql") {
      const { req, res } = GqlExecutionContext.create(context).getContext<ThrottledExchange>();
      return { req, res };
    }
    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }
}
