import { ProjectTicket } from "../../application/use-cases/tickets/project-ticket.use-case";
import { SendAgentInvitation } from "../../application/use-cases/staff/send-agent-invitation.use-case";
import { environment } from "../../shared/config/environment";
import { SystemClock } from "../outbound/clock/system-clock";
import { NodemailerEmailSender } from "../outbound/email/nodemailer-email-sender";
import { STAFF_NOTIFICATIONS_GROUP, startStaffNotificationsConsumer } from "../inbound/events/staff-notifications.consumer";
import { TICKET_PROJECTION_GROUP, startTicketProjectionConsumer } from "../inbound/events/ticket-projection.consumer";
import { DrizzleTicketEventLog } from "../outbound/persistence/drizzle-ticket-event-log";
import { Client } from "@elastic/elasticsearch";
import { requireElasticsearchUrl } from "../../shared/config/environment";
import { createTicketSearchIndex } from "./search";
import { closeDrizzle, getDrizzleClient } from "../outbound/persistence/database";
import { DrizzleAgentRepository } from "../outbound/persistence/drizzle-agent.repository";
import { DrizzleInbox } from "../outbound/persistence/drizzle-inbox";
import { DrizzleInvitationStore } from "../outbound/persistence/drizzle-invitation-store";
import { createMessageConsumer, createMessagePublisher } from "./messaging";

export interface RunningWorker {
  stop(): Promise<void>;
}

export const startWorker = async (): Promise<RunningWorker> => {
  const client = getDrizzleClient();
  const emails = new NodemailerEmailSender({
    host: environment.smtpHost,
    port: environment.smtpPort,
    from: environment.smtpFrom,
  });
  const messaging = await createMessagePublisher();
  const staffNotifications = await createMessageConsumer(STAFF_NOTIFICATIONS_GROUP);
  await startStaffNotificationsConsumer({
    consumer: staffNotifications,
    inbox: new DrizzleInbox(client),
    publisher: messaging.publisher,
    sendAgentInvitation: new SendAgentInvitation(
      new DrizzleAgentRepository(client),
      new DrizzleInvitationStore(client),
      emails,
      new SystemClock(),
      { publicUrl: environment.appPublicUrl, ttlHours: environment.invitationTtlHours },
    ),
  });
  const ticketProjection = await createMessageConsumer(TICKET_PROJECTION_GROUP);
  const elasticsearch = new Client({ node: requireElasticsearchUrl() });
  await startTicketProjectionConsumer({
    consumer: ticketProjection,
    inbox: new DrizzleInbox(client),
    publisher: messaging.publisher,
    projectTicket: new ProjectTicket(new DrizzleTicketEventLog(client), await createTicketSearchIndex(elasticsearch)),
  });
  return {
    stop: async () => {
      await staffNotifications.close();
      await ticketProjection.close();
      await elasticsearch.close();
      await messaging.close();
      emails.close();
      await closeDrizzle();
    },
  };
};
