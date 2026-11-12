export type EventEnvelope<TBody extends object = object> = TBody & {
  eventId: string;
  type: string;
  correlationId: string;
};
