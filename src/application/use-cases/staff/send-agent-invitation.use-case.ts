import { AgentRepository } from "../../../domain/repositories/agent.repository";
import { Clock } from "../../../shared/contracts/clock";
import { EmailSender } from "../../../shared/contracts/email-sender";
import { InvitationStore } from "../../../shared/contracts/invitation-store";
import { UseCase } from "../../../shared/contracts/use-case";
import { CryptoUtils } from "../../../shared/utils/crypto";

export interface SendAgentInvitationInput {
  agentId: string;
}

export interface InvitationSettings {
  publicUrl: string;
  ttlHours: number;
}

const MILLISECONDS_PER_HOUR = 3_600_000;
const INVITED_STATUS = "invited";

export class SendAgentInvitation implements UseCase<SendAgentInvitationInput, void> {
  constructor(
    private readonly agents: AgentRepository,
    private readonly invitations: InvitationStore,
    private readonly emails: EmailSender,
    private readonly clock: Clock,
    private readonly settings: InvitationSettings,
  ) {}

  async execute({ agentId }: SendAgentInvitationInput): Promise<void> {
    const agent = await this.agents.findById(agentId);
    if (agent === null || agent.status !== INVITED_STATUS) {
      return;
    }
    const token = CryptoUtils.randomToken();
    const expiresAt = new Date(this.clock.now().getTime() + this.settings.ttlHours * MILLISECONDS_PER_HOUR);
    await this.invitations.issue(agent.id, CryptoUtils.sha256(token), expiresAt);
    const link = `${this.settings.publicUrl}/invitations/accept?token=${token}`;
    await this.emails.send({
      to: agent.email,
      subject: "Invitación a Tickets Handler: configura tu contraseña",
      text: [
        `Hola ${agent.name},`,
        "",
        "Te han invitado a unirte a Tickets Handler. Para activar tu cuenta debes fijar tu contraseña (mínimo 12 caracteres) desde este enlace:",
        link,
        "",
        `El enlace caduca en ${this.settings.ttlHours} horas y solo puede usarse una vez.`,
      ].join("\n"),
    });
  }
}
