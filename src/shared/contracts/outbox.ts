export interface OutboxMessage {
  id: string;
  topic: string;
  payload: unknown;
}

export interface OutboxWriter {
  enqueue(topic: string, payload: unknown): Promise<void>;
}

export interface OutboxStore extends OutboxWriter {
  claimPending(limit: number): Promise<OutboxMessage[]>;
  markPublished(ids: string[]): Promise<void>;
}
