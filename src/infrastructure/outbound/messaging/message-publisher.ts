export interface PublishOptions {
  key?: string;
}

export interface MessagePublisher {
  publish<TPayload>(topic: string, payload: TPayload, options?: PublishOptions): Promise<void>;
}
