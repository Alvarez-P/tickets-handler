import { EmailMessage, EmailSender } from "../../src/application/ports/email-sender";

export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}
