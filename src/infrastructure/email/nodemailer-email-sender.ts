import { Transporter, createTransport } from "nodemailer";
import { EmailMessage, EmailSender } from "../../shared/contracts/email-sender";

export interface SmtpConfig {
  host: string;
  port: number;
  from: string;
}

export class NodemailerEmailSender implements EmailSender {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = createTransport({ host: config.host, port: config.port, secure: false });
  }

  async send({ to, subject, text, html }: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.config.from, to, subject, text, html });
  }

  close(): void {
    this.transporter.close();
  }
}
