import { IEvent } from "@nestjs/cqrs";

export {
  Command,
  CommandBus,
  CommandHandler,
  CqrsModule,
  EventBus,
  EventsHandler,
  Query,
  QueryBus,
  QueryHandler,
} from "@nestjs/cqrs";
export type {
  CommandResult,
  ICommandHandler,
  IEventHandler,
  IQueryHandler,
  QueryResult,
} from "@nestjs/cqrs";

export abstract class DomainEvent implements IEvent {}
