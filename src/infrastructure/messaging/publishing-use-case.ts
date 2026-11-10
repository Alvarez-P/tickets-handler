import { MessagePublisher } from "../../shared/contracts/message-publisher";
import { UseCase } from "../../shared/contracts/use-case";

export class PublishingUseCase<TInput, TOutput> implements UseCase<TInput, TOutput> {
  constructor(
    private readonly inner: UseCase<TInput, TOutput>,
    private readonly publisher: MessagePublisher,
    private readonly topic: string,
    private readonly keyOf?: (output: TOutput) => string | undefined,
  ) {}

  async execute(input: TInput): Promise<TOutput> {
    const output = await this.inner.execute(input);
    await this.publisher.publish(this.topic, output, { key: this.keyOf?.(output) });
    return output;
  }
}
