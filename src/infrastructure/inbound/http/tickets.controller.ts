import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ApiZodBody, ApiZodQuery } from "./api-docs";
import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ReceivedTicket } from "../../../application/use-cases/tickets/receive-ticket.use-case";
import { TransitionedTicket } from "../../../application/use-cases/tickets/transition-ticket.use-case";
import { TicketSearchPage } from "../../../application/use-cases/tickets/search-tickets.use-case";
import { TicketView } from "../../../application/use-cases/tickets/ticket-view.projection";
import { GetTicketQuery, ReceiveTicketCommand, SearchTicketsQuery, TransitionTicketCommand } from "../cqrs/tickets.cqrs";
import { scopeTicketLookup, scopeTicketSearch } from "../../../application/use-cases/tickets/ticket-visibility";
import { Roles } from "./auth/roles.decorator";
import { RolesGuard } from "./auth/roles.guard";
import { AuthenticatedRequest, JwtAuthGuard, requireClaims } from "./auth/jwt-auth.guard";
import { parseInput } from "./parse-input";
import { receiveTicketSchema, searchTicketsSchema, transitionTicketSchema } from "./tickets.schemas";

@ApiTags("tickets")
@ApiBearerAuth()
@Controller("tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiZodQuery(searchTicketsSchema)
  @Roles("admin", "support-agent", "specialist-agent")
  search(@Query() query: unknown, @Req() request: AuthenticatedRequest): Promise<TicketSearchPage> {
    return this.queries.execute(
      new SearchTicketsQuery(scopeTicketSearch(requireClaims(request), parseInput(searchTicketsSchema, query))),
    );
  }

  @Get(":id")
  @Roles("admin", "support-agent", "specialist-agent")
  get(@Param("id") ticketId: string, @Req() request: AuthenticatedRequest): Promise<TicketView> {
    return this.queries.execute(new GetTicketQuery(scopeTicketLookup(requireClaims(request), ticketId)));
  }

  @Post()
  @ApiZodBody(receiveTicketSchema)
  @Roles("admin", "support-agent")
  receive(@Body() body: unknown, @Req() request: AuthenticatedRequest): Promise<ReceivedTicket> {
    const { sub } = requireClaims(request);
    return this.commands.execute(new ReceiveTicketCommand({ ...parseInput(receiveTicketSchema, body), createdBy: sub }));
  }

  @Post(":id/transitions")
  @ApiZodBody(transitionTicketSchema)
  @Roles("admin", "support-agent", "specialist-agent")
  transition(
    @Param("id") ticketId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<TransitionedTicket> {
    const { sub, roles } = requireClaims(request);
    const transition = parseInput(transitionTicketSchema, body);
    if (transition.action === "cancel" && !roles.some((role) => role === "admin" || role === "support-agent")) {
      throw new ForbiddenException();
    }
    return this.commands.execute(new TransitionTicketCommand({ ticketId, actorId: sub, transition }));
  }
}
