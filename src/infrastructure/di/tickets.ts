import { ReceiveTicket, ReceiveTicketCommand, ReceivedTicket } from "../../application/use-cases/tickets/receive-ticket.use-case";
import {
  TransitionTicket,
  TransitionTicketCommand,
  TransitionedTicket,
} from "../../application/use-cases/tickets/transition-ticket.use-case";
import { GetTicket, GetTicketInput } from "../../application/use-cases/tickets/get-ticket.use-case";
import { SearchTickets, SearchTicketsInput, TicketSearchPage } from "../../application/use-cases/tickets/search-tickets.use-case";
import { TicketView } from "../../application/use-cases/tickets/ticket-view.projection";
import { TicketEventLog } from "../../domain/repositories/ticket-event-log";
import { SearchIndex } from "../../shared/contracts/search-index";
import { TicketClassifier } from "../../domain/services/ticket-classifier";
import { TicketUnitOfWork } from "../../shared/contracts/ticket-unit-of-work";
import { UseCase } from "../../shared/contracts/use-case";

export interface TicketsContainer {
  receiveTicket: UseCase<ReceiveTicketCommand, ReceivedTicket>;
  transitionTicket: UseCase<TransitionTicketCommand, TransitionedTicket>;
  getTicket: UseCase<GetTicketInput, TicketView>;
  searchTickets: UseCase<SearchTicketsInput, TicketSearchPage>;
}

export const buildTicketsContainer = (
  unitOfWork: TicketUnitOfWork,
  classifier: TicketClassifier,
  eventLog: TicketEventLog,
  index: SearchIndex<TicketView>,
): TicketsContainer => ({
  receiveTicket: new ReceiveTicket(unitOfWork, classifier),
  transitionTicket: new TransitionTicket(unitOfWork),
  getTicket: new GetTicket(eventLog),
  searchTickets: new SearchTickets(index),
});
