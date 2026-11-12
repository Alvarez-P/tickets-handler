import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { environment } from "./shared/config/environment";
import { CONTAINER } from "./infrastructure/di/tokens";
import { CompositionModule } from "./infrastructure/di/composition.module";
import { Container } from "./infrastructure/di/container";
import { RestModule } from "./infrastructure/http/rest.module";
import { GraphqlModule } from "./infrastructure/graphql/graphql.module";
import { GqlThrottlerGuard } from "./infrastructure/rate-limit/gql-throttler.guard";
import { CorrelationIdMiddleware } from "./infrastructure/http/correlation-id.middleware";
import { DomainErrorFilter } from "./infrastructure/http/domain-error.filter";

@Module({
  imports: [
    CompositionModule,
    ThrottlerModule.forRootAsync({
      inject: [CONTAINER],
      useFactory: (container: Container) => ({
        throttlers: [{ ttl: environment.rateLimitWindowMs, limit: environment.rateLimitMax }],
        storage: container.throttlerStorage,
      }),
    }),
    RestModule,
    GraphqlModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*path");
  }
}
