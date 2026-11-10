import { CreateUser, CreateUserInput } from "../../application/use-cases/create-user.use-case";
import { IssueTokenPair, IssueTokenPairInput, TokenPair } from "../../application/use-cases/auth/issue-token-pair.use-case";
import {
  RotateRefreshToken,
  RotateRefreshTokenInput,
} from "../../application/use-cases/auth/rotate-refresh-token.use-case";
import {
  VerifiedUser,
  VerifyCredentials,
  VerifyCredentialsInput,
} from "../../application/use-cases/auth/verify-credentials.use-case";
import { AcceptInvitation, AcceptInvitationInput } from "../../application/use-cases/auth/accept-invitation.use-case";
import { Clock } from "../../shared/contracts/clock";
import { CredentialStore } from "../../shared/contracts/credential-store";
import { RefreshTokenStore } from "../../shared/contracts/refresh-token-store";
import { CryptoUtils } from "../../shared/utils/crypto";
import { durationToSeconds } from "../../shared/utils/duration";
import { ScryptPasswordHasher } from "../auth/scrypt-password-hasher";
import { SystemClock } from "../auth/system-clock";
import { DrizzleCredentialStore } from "../persistence/drizzle-credential-store";
import { DrizzleInvitationStore } from "../persistence/drizzle-invitation-store";
import { DrizzleRefreshTokenStore } from "../persistence/drizzle-refresh-token-store";
import { QueryableRepository } from "../../shared/contracts/queryable-repository";
import { UseCase } from "../../shared/contracts/use-case";
import { UserRecord } from "../../shared/contracts/user-record";
import { createPersistence } from "./persistence";
import { StaffContainer, buildStaffContainer } from "./staff";
import { TicketsContainer, buildTicketsContainer } from "./tickets";
import { RuleBasedTicketClassifier } from "../../domain/services/rule-based-ticket-classifier";
import { DrizzleTicketUnitOfWork } from "../persistence/drizzle-ticket-unit-of-work";
import { DrizzleAgentRepository } from "../persistence/drizzle-agent.repository";
import { DrizzleSpecialtyRepository } from "../persistence/drizzle-specialty.repository";
import { DrizzleStaffUnitOfWork } from "../persistence/drizzle-staff-unit-of-work";
import { CachedRepository } from "../cache/cached-repository";
import { RedisCache } from "../cache/redis-cache";
import { requireRedisUrl } from "../../shared/config/environment";
import { JoseTokenService } from "../auth/jose-token-service";
import { environment, requireJwtSecret } from "../../shared/config/environment";
import { TokenService } from "../../shared/contracts/token-service";
import { Client } from "@elastic/elasticsearch";
import { Kafka } from "kafkajs";
import { ThrottlerStorage } from "@nestjs/throttler";
import { HealthProbe } from "../../shared/contracts/health-probe";
import { RedisThrottlerStorage } from "../rate-limit/redis-throttler-storage";
import { createTicketSearchIndex } from "./search";
import { DrizzleTicketEventLog } from "../persistence/drizzle-ticket-event-log";
import { createHealthProbes } from "../observability/health-probes";
import { getDrizzleClient } from "../persistence/database";
import { messagingConfig } from "../messaging/messaging-config";
import { requireElasticsearchUrl } from "../../shared/config/environment";

export type { CreateUserInput };

export interface Container {
  users: QueryableRepository<UserRecord>;
  createUser: UseCase<CreateUserInput, UserRecord>;
  tokens: TokenService;
  credentialStore: CredentialStore;
  refreshTokenStore: RefreshTokenStore;
  clock: Clock;
  verifyCredentials: UseCase<VerifyCredentialsInput, VerifiedUser>;
  issueTokenPair: UseCase<IssueTokenPairInput, TokenPair>;
  rotateRefreshToken: UseCase<RotateRefreshTokenInput, TokenPair>;
  acceptInvitation: UseCase<AcceptInvitationInput, void>;
  throttlerStorage: ThrottlerStorage;
  healthProbes: HealthProbe[];
  staff: StaffContainer;
  tickets: TicketsContainer;
  close(): Promise<void>;
}

export const buildContainer = async (): Promise<Container> => {
  const persistence = await createPersistence();
  const source = persistence.repository;
  const cache = new RedisCache(requireRedisUrl());
  const users = new CachedRepository(source, cache, "user");
  const hasher = new ScryptPasswordHasher();
  const createUser = new CreateUser(persistence.unitOfWork, hasher);
  const client = getDrizzleClient();
  const credentialStore = new DrizzleCredentialStore(client);
  const refreshTokenStore = new DrizzleRefreshTokenStore(client);
  const clock = new SystemClock();
  const tokens = new JoseTokenService(requireJwtSecret(), environment.jwtExpiresIn);
  const issueTokenPair = new IssueTokenPair(tokens, refreshTokenStore, clock, {
    accessTtlSeconds: durationToSeconds(environment.jwtExpiresIn),
    refreshTtlDays: environment.refreshTokenTtlDays,
  });
  const verifyCredentials = new VerifyCredentials(credentialStore, hasher, await hasher.hash(CryptoUtils.randomToken()));
  const rotateRefreshToken = new RotateRefreshToken(refreshTokenStore, source, issueTokenPair, clock);
  const acceptInvitation = new AcceptInvitation(
    new DrizzleInvitationStore(client),
    persistence.unitOfWork,
    hasher,
    clock,
    users,
  );
  const elasticsearch = new Client({ node: requireElasticsearchUrl() });
  const healthProbes = createHealthProbes({
    database: getDrizzleClient().$client,
    redis: cache.client,
    elasticsearch,
    kafka: new Kafka({ clientId: messagingConfig.clientId, brokers: [...messagingConfig.brokers] }),
  });
  return {
    users,
    createUser,
    tokens,
    credentialStore,
    refreshTokenStore,
    clock,
    verifyCredentials,
    issueTokenPair,
    rotateRefreshToken,
    acceptInvitation,
    throttlerStorage: new RedisThrottlerStorage(cache.client),
    healthProbes,
    staff: buildStaffContainer(
      new DrizzleSpecialtyRepository(client),
      new DrizzleAgentRepository(client),
      new DrizzleStaffUnitOfWork(client),
      users,
    ),
    tickets: buildTicketsContainer(
      new DrizzleTicketUnitOfWork(client),
      new RuleBasedTicketClassifier(),
      new DrizzleTicketEventLog(client),
      await createTicketSearchIndex(elasticsearch),
    ),
    close: async () => {
      await elasticsearch.close();
      await cache.close();
      await persistence.close();
    },
  };
};
