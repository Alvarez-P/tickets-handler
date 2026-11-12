export interface MessageContext {
  topic: string;
  key?: string;
  partition?: number;
  offset?: string;
}

export type MessageHandler<TPayload> = (payload: TPayload, context: MessageContext) => Promise<void>;

export interface MessageConsumer {
  subscribe<TPayload>(topic: string, handler: MessageHandler<TPayload>): Promise<void>;
  start(): Promise<void>;
  close(): Promise<void>;
}
