import { Module } from "@nestjs/common";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { HealthResolver } from "./health.resolver";
import { TicketsResolver } from "./tickets.resolver";

interface GraphqlHttpContext {
  req: unknown;
  res: unknown;
}

@Module({
  imports: [GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: true,
      context: ({ req, res }: GraphqlHttpContext): GraphqlHttpContext => ({ req, res }),
    }),],
  providers: [HealthResolver, TicketsResolver],
})
export class GraphqlModule {}
