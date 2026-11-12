import { ThrottlerStorageService } from "@nestjs/throttler";
import { IssueTokenPair } from "../../src/application/use-cases/auth/issue-token-pair.use-case";
import { RotateRefreshToken } from "../../src/application/use-cases/auth/rotate-refresh-token.use-case";
import { VerifyCredentials } from "../../src/application/use-cases/auth/verify-credentials.use-case";
import { AcceptInvitation } from "../../src/application/use-cases/auth/accept-invitation.use-case";
import { CreateUser } from "../../src/application/use-cases/create-user.use-case";
import { JoseTokenService } from "../../src/infrastructure/outbound/security/jose-token-service";
import { ScryptPasswordHasher } from "../../src/infrastructure/outbound/security/scrypt-password-hasher";
import { SystemClock } from "../../src/infrastructure/outbound/clock/system-clock";
import { Container } from "../../src/infrastructure/di/container";
import { buildStaffContainer } from "../../src/infrastructure/di/staff";
import { buildTicketsContainer } from "../../src/infrastructure/di/tickets";
import { RuleBasedTicketClassifier } from "../../src/domain/services/rule-based-ticket-classifier";
import { ProjectTicket } from "../../src/application/use-cases/tickets/project-ticket.use-case";
import { TicketView } from "../../src/application/use-cases/tickets/ticket-view.projection";
import { InMemorySearchIndex, InMemoryTicketRepository, InMemoryTicketUnitOfWork } from "../../src/shared/testing/in-memory-tickets";
import { FakeCacheInvalidator } from "../../src/shared/testing/fake-cache-invalidator";
import { FakeEmailSender } from "../../src/shared/testing/fake-email-sender";
import { InMemoryInvitationStore } from "../../src/shared/testing/in-memory-invitation-store";
import { InMemoryCredentialStore, InMemoryRefreshTokenStore } from "../../src/shared/testing/in-memory-auth-stores";
import { InMemoryAgentRepository, InMemorySpecialtyRepository, InMemoryStaffUnitOfWork } from "../../src/shared/testing/in-memory-staff";
import { InMemoryUnitOfWork } from "../../src/shared/testing/in-memory-unit-of-work";

export const tokens = new JoseTokenService("test-secret-test-secret-test-secret-1234");
export const hasher = new ScryptPasswordHasher();
export interface TestEnvironment {
  container: Container;
  invitations: InMemoryInvitationStore;
  emails: FakeEmailSender;
  userCache: FakeCacheInvalidator;
  projectTicket: ProjectTicket;
}

export const buildTestContainer = async (): Promise<Container> => (await buildTestEnvironment()).container;

export const buildTestEnvironment = async (): Promise<TestEnvironment> => {
  const users = new InMemoryAgentRepository();
  const specialties = new InMemorySpecialtyRepository();
  const credentialStore = new InMemoryCredentialStore(users);
  const refreshTokenStore = new InMemoryRefreshTokenStore();
  const clock = new SystemClock();
  const issueTokenPair = new IssueTokenPair(tokens, refreshTokenStore, clock, { accessTtlSeconds: 900, refreshTtlDays: 7 });
  const invitations = new InMemoryInvitationStore();
  const userCache = new FakeCacheInvalidator();
  const unitOfWork = new InMemoryUnitOfWork(users, credentialStore);
  const ticketRepository = new InMemoryTicketRepository();
  const ticketIndex = new InMemorySearchIndex<TicketView>();
  const container: Container = {
    users,
    createUser: new CreateUser(unitOfWork, hasher),
    tokens,
    credentialStore,
    refreshTokenStore,
    clock,
    verifyCredentials: new VerifyCredentials(credentialStore, hasher, await hasher.hash("unused")),
    issueTokenPair,
    rotateRefreshToken: new RotateRefreshToken(refreshTokenStore, users, issueTokenPair, clock),
    acceptInvitation: new AcceptInvitation(invitations, unitOfWork, hasher, clock, userCache),
    throttlerStorage: new ThrottlerStorageService(),
    healthProbes: [],
    staff: buildStaffContainer(specialties, users, new InMemoryStaffUnitOfWork(users, specialties), userCache),
    tickets: buildTicketsContainer(
      new InMemoryTicketUnitOfWork(ticketRepository, users, specialties),
      new RuleBasedTicketClassifier(),
      ticketRepository.eventLog,
      ticketIndex,
    ),
    close: async () => undefined,
  };
  return {
    container,
    invitations,
    emails: new FakeEmailSender(),
    userCache,
    projectTicket: new ProjectTicket(ticketRepository.eventLog, ticketIndex),
  };
};
