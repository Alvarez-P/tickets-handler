export interface InboxStore {
  has(consumer: string, eventId: string): Promise<boolean>;
  mark(consumer: string, eventId: string): Promise<void>;
}
