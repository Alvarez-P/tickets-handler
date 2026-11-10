import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ReceivedTicket } from "../../application/use-cases/tickets/receive-ticket.use-case";
import { TransitionedTicket } from "../../application/use-cases/tickets/transition-ticket.use-case";
import { TicketSearchPage } from "../../application/use-cases/tickets/search-tickets.use-case";
import { TicketView } from "../../application/use-cases/tickets/ticket-view.projection";
import { GetTicketQuery, ReceiveTicketCommand, SearchTicketsQuery, TransitionTicketCommand } from "../../application/use-cases/tickets/tickets.cqrs";
import { AuthClaims } from "../../shared/contracts/token-service";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AuthenticatedRequest, JwtAuthGuard } from "./jwt-auth.guard";
import { parseInput } from "./parse-input";
import { receiveTicketSchema, searchTicketsSchema, transitionTicketSchema } from "./tickets.schemas";

const requireClaims = ({ claims }: AuthenticatedRequest): AuthClaims => {
  if (!claims) {
    throw new UnauthorizedException();
  }
  return claims;
};

const seesAllTickets = (roles: readonly string[]): boolean =>
  roles.some((role) => role === "admin" || role === "support-agent");

@Controller("tickets")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @Roles("admin", "support-agent", "specialist-agent")
  search(@Query() query: unknown, @Req() request: AuthenticatedRequest): Promise<TicketSearchPage> {
    const { sub, roles } = requireClaims(request);
    const input = parseInput(searchTicketsSchema, query);
    const filters = seesAllTickets(roles) ? input.filters : { ...input.filters, assigneeId: sub };
    return this.queries.execute(new SearchTicketsQuery({ ...input, filters }));
  }

  @Get(":id")
  @Roles("admin", "support-agent", "specialist-agent")
  get(@Param("id") ticketId: string, @Req() request: AuthenticatedRequest): Promise<TicketView> {
    const { sub, roles } = requireClaims(request);
    return this.queries.execute(
      new GetTicketQuery({ ticketId, ...(seesAllTickets(roles) ? {} : { onlyAssignedTo: sub }) }),
    );
  }

  @Post()
  @Roles("admin", "support-agent")
  receive(@Body() body: unknown, @Req() request: AuthenticatedRequest): Promise<ReceivedTicket> {
    const { sub } = requireClaims(request);
    return this.commands.execute(new ReceiveTicketCommand({ ...parseInput(receiveTicketSchema, body), createdBy: sub }));
  }

  @Post(":id/transitions")
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
