import { StoredTicketEvent, TICKET_EVENTS_TOPIC, TicketEventMessage } from "../../../domain/events/ticket-events";
import { OutboxWriter } from "../../../shared/contracts/outbox";

export const publishTicketEvents = async (outbox: OutboxWriter, stored: readonly StoredTicketEvent[]): Promise<void> => {
  for (const { event, eventId, ticketId, version, position, occurredAt, metadata } of stored) {
    const message: TicketEventMessage = {
      type: event.type,
      eventId,
      ticketId,
      version,
      position,
      occurredAt,
      correlationId: metadata.correlationId,
      event,
    };
    await outbox.enqueue(TICKET_EVENTS_TOPIC, message);
  }
};
