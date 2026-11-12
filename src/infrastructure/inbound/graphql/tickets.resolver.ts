import { UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { TicketSearchPage } from "../../../application/use-cases/tickets/search-tickets.use-case";
import { TicketView } from "../../../application/use-cases/tickets/ticket-view.projection";
import { scopeTicketLookup, scopeTicketSearch } from "../../../application/use-cases/tickets/ticket-visibility";
import { GetTicketQuery, SearchTicketsQuery } from "../cqrs/tickets.cqrs";
import { AuthenticatedRequest, JwtAuthGuard, requireClaims } from "../http/auth/jwt-auth.guard";
import { Roles } from "../http/auth/roles.decorator";
import { RolesGuard } from "../http/auth/roles.guard";
import { parseInput } from "../http/parse-input";
import { searchTicketsSchema } from "../http/tickets.schemas";
import { SearchTicketsArgs, TicketObject, TicketSearchPageObject } from "./ticket.types";

@Resolver(() => TicketObject)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "support-agent", "specialist-agent")
export class TicketsResolver {
  constructor(private readonly queries: QueryBus) {}

  @Query(() => TicketObject)
  ticket(@Args("id") ticketId: string, @Context("req") request: AuthenticatedRequest): Promise<TicketView> {
    return this.queries.execute(new GetTicketQuery(scopeTicketLookup(requireClaims(request), ticketId)));
  }

  @Query(() => TicketSearchPageObject)
  tickets(@Args() args: SearchTicketsArgs, @Context("req") request: AuthenticatedRequest): Promise<TicketSearchPage> {
    return this.queries.execute(
      new SearchTicketsQuery(scopeTicketSearch(requireClaims(request), parseInput(searchTicketsSchema, args))),
    );
  }
}
