import { Inject } from "@nestjs/common";
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { UseCase } from "../../../shared/contracts/use-case";
import { Command, Query } from "../../../shared/cqrs/cqrs";
import { GET_TICKET, RECEIVE_TICKET, SEARCH_TICKETS, TRANSITION_TICKET } from "../../../shared/di/tokens";
import { GetTicketInput } from "./get-ticket.use-case";
import { SearchTicketsInput, TicketSearchPage } from "./search-tickets.use-case";
import { TicketView } from "./ticket-view.projection";
import { ReceiveTicketCommand as ReceiveTicketInput, ReceivedTicket } from "./receive-ticket.use-case";
import { TransitionTicketCommand as TransitionTicketInput, TransitionedTicket } from "./transition-ticket.use-case";

export class ReceiveTicketCommand extends Command<ReceivedTicket> {
  constructor(readonly input: ReceiveTicketInput) {
    super();
  }
}

export class TransitionTicketCommand extends Command<TransitionedTicket> {
  constructor(readonly input: TransitionTicketInput) {
    super();
  }
}

export class GetTicketQuery extends Query<TicketView> {
  constructor(readonly input: GetTicketInput) {
    super();
  }
}

export class SearchTicketsQuery extends Query<TicketSearchPage> {
  constructor(readonly input: SearchTicketsInput) {
    super();
  }
}

@CommandHandler(ReceiveTicketCommand)
export class ReceiveTicketHandler implements ICommandHandler<ReceiveTicketCommand, ReceivedTicket> {
  constructor(@Inject(RECEIVE_TICKET) private readonly receiveTicket: UseCase<ReceiveTicketInput, ReceivedTicket>) {}

  execute(command: ReceiveTicketCommand): Promise<ReceivedTicket> {
    return this.receiveTicket.execute(command.input);
  }
}

@CommandHandler(TransitionTicketCommand)
export class TransitionTicketHandler implements ICommandHandler<TransitionTicketCommand, TransitionedTicket> {
  constructor(
    @Inject(TRANSITION_TICKET) private readonly transitionTicket: UseCase<TransitionTicketInput, TransitionedTicket>,
  ) {}

  execute(command: TransitionTicketCommand): Promise<TransitionedTicket> {
    return this.transitionTicket.execute(command.input);
  }
}

@QueryHandler(GetTicketQuery)
export class GetTicketHandler implements IQueryHandler<GetTicketQuery, TicketView> {
  constructor(@Inject(GET_TICKET) private readonly getTicket: UseCase<GetTicketInput, TicketView>) {}

  execute(query: GetTicketQuery): Promise<TicketView> {
    return this.getTicket.execute(query.input);
  }
}

@QueryHandler(SearchTicketsQuery)
export class SearchTicketsHandler implements IQueryHandler<SearchTicketsQuery, TicketSearchPage> {
  constructor(@Inject(SEARCH_TICKETS) private readonly searchTickets: UseCase<SearchTicketsInput, TicketSearchPage>) {}

  execute(query: SearchTicketsQuery): Promise<TicketSearchPage> {
    return this.searchTickets.execute(query.input);
  }
}

export const ticketsCqrsHandlers = [ReceiveTicketHandler, TransitionTicketHandler, GetTicketHandler, SearchTicketsHandler];
