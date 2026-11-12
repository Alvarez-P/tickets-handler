import { Global, Inject, Module, OnApplicationShutdown } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { authCqrsHandlers } from "../cqrs/auth.cqrs";
import { userCqrsHandlers } from "../cqrs/user.cqrs";
import { ticketsCqrsHandlers } from "../cqrs/tickets.cqrs";
import { staffCqrsHandlers } from "../cqrs/staff.cqrs";
import { Container, buildContainer } from "./container";
import {
  ACCEPT_INVITATION,
  CONTAINER,
  CREATE_AGENT,
  CREATE_SPECIALTY,
  CREATE_USER,
  GET_AGENT,
  GET_TICKET,
  HEALTH_PROBES,
  ISSUE_TOKEN_PAIR,
  LIST_AGENTS,
  LIST_SPECIALTIES,
  RECEIVE_TICKET,
  ROTATE_REFRESH_TOKEN,
  SEARCH_TICKETS,
  SET_SPECIALTY_ACTIVE,
  TOKENS,
  TRANSITION_TICKET,
  UPDATE_AGENT,
  USERS,
  VERIFY_CREDENTIALS,
} from "./tokens";

export {
  ACCEPT_INVITATION,
  CONTAINER,
  CREATE_AGENT,
  CREATE_SPECIALTY,
  CREATE_USER,
  GET_AGENT,
  GET_TICKET,
  HEALTH_PROBES,
  ISSUE_TOKEN_PAIR,
  LIST_AGENTS,
  LIST_SPECIALTIES,
  RECEIVE_TICKET,
  ROTATE_REFRESH_TOKEN,
  SEARCH_TICKETS,
  SET_SPECIALTY_ACTIVE,
  TOKENS,
  TRANSITION_TICKET,
  UPDATE_AGENT,
  USERS,
  VERIFY_CREDENTIALS,
};

@Global()
@Module({
  imports: [CqrsModule.forRoot()],
  providers: [
    { provide: CONTAINER, useFactory: buildContainer },
    { provide: CREATE_USER, useFactory: (container: Container) => container.createUser, inject: [CONTAINER] },
    { provide: USERS, useFactory: (container: Container) => container.users, inject: [CONTAINER] },
    { provide: TOKENS, useFactory: (container: Container) => container.tokens, inject: [CONTAINER] },
    { provide: HEALTH_PROBES, useFactory: (container: Container) => container.healthProbes, inject: [CONTAINER] },
    {
      provide: VERIFY_CREDENTIALS,
      useFactory: (container: Container) => container.verifyCredentials,
      inject: [CONTAINER],
    },
    { provide: ISSUE_TOKEN_PAIR, useFactory: (container: Container) => container.issueTokenPair, inject: [CONTAINER] },
    {
      provide: ROTATE_REFRESH_TOKEN,
      useFactory: (container: Container) => container.rotateRefreshToken,
      inject: [CONTAINER],
    },
    { provide: ACCEPT_INVITATION, useFactory: (container: Container) => container.acceptInvitation, inject: [CONTAINER] },
    { provide: CREATE_SPECIALTY, useFactory: (container: Container) => container.staff.createSpecialty, inject: [CONTAINER] },
    {
      provide: SET_SPECIALTY_ACTIVE,
      useFactory: (container: Container) => container.staff.setSpecialtyActive,
      inject: [CONTAINER],
    },
    { provide: LIST_SPECIALTIES, useFactory: (container: Container) => container.staff.listSpecialties, inject: [CONTAINER] },
    { provide: CREATE_AGENT, useFactory: (container: Container) => container.staff.createAgent, inject: [CONTAINER] },
    { provide: UPDATE_AGENT, useFactory: (container: Container) => container.staff.updateAgent, inject: [CONTAINER] },
    { provide: LIST_AGENTS, useFactory: (container: Container) => container.staff.listAgents, inject: [CONTAINER] },
    { provide: GET_AGENT, useFactory: (container: Container) => container.staff.getAgent, inject: [CONTAINER] },
    { provide: RECEIVE_TICKET, useFactory: (container: Container) => container.tickets.receiveTicket, inject: [CONTAINER] },
    {
      provide: TRANSITION_TICKET,
      useFactory: (container: Container) => container.tickets.transitionTicket,
      inject: [CONTAINER],
    },
    { provide: GET_TICKET, useFactory: (container: Container) => container.tickets.getTicket, inject: [CONTAINER] },
    { provide: SEARCH_TICKETS, useFactory: (container: Container) => container.tickets.searchTickets, inject: [CONTAINER] },
    ...userCqrsHandlers,
    ...authCqrsHandlers,
    ...staffCqrsHandlers,
    ...ticketsCqrsHandlers,
  ],
  exports: [
    ACCEPT_INVITATION,
    CONTAINER,
    CREATE_USER,
    USERS,
    TOKENS,
    HEALTH_PROBES,
    VERIFY_CREDENTIALS,
    ISSUE_TOKEN_PAIR,
    ROTATE_REFRESH_TOKEN,
    CREATE_SPECIALTY,
    SET_SPECIALTY_ACTIVE,
    LIST_SPECIALTIES,
    CREATE_AGENT,
    UPDATE_AGENT,
    LIST_AGENTS,
    GET_AGENT,
    RECEIVE_TICKET,
    TRANSITION_TICKET,
    GET_TICKET,
    SEARCH_TICKETS,
    CqrsModule,
  ],
})
export class CompositionModule implements OnApplicationShutdown {
  constructor(@Inject(CONTAINER) private readonly container: Container) {}

  async onApplicationShutdown(): Promise<void> {
    await this.container.close();
  }
}
