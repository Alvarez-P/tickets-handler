import { SendAgentInvitation } from "../../src/application/use-cases/staff/send-agent-invitation.use-case";
import { UserRecord } from "../../src/domain/entities/user";
import { CryptoUtils } from "../../src/shared/utils/crypto";
import { FakeEmailSender } from "../../src/shared/testing/fake-email-sender";
import { FixedClock } from "../../src/shared/testing/in-memory-auth-stores";
import { InMemoryInvitationStore } from "../../src/shared/testing/in-memory-invitation-store";
import { InMemoryAgentRepository } from "../../src/shared/testing/in-memory-staff";

const NOW = new Date("2026-01-01T00:00:00Z");
const settings = { publicUrl: "https://app.example.com", ttlHours: 24 };
const agent: UserRecord = { id: "a1", email: "ada@example.com", name: "Ada", role: "support-agent", status: "invited" };

const build = async (status: UserRecord["status"] = "invited") => {
  const agents = new InMemoryAgentRepository();
  await agents.save({ ...agent, status });
  const invitations = new InMemoryInvitationStore();
  const emails = new FakeEmailSender();
  const clock = new FixedClock(NOW);
  return { invitations, emails, clock, useCase: new SendAgentInvitation(agents, invitations, emails, clock, settings) };
};

const tokenOf = (text: string): string => {
  const token = new URL(text.match(/https?:\/\/\S+/)?.[0] ?? "").searchParams.get("token");
  return token ?? "";
};

describe("SendAgentInvitation", () => {
  it("emails a link with the plain token while storing only its hash", async () => {
    const { useCase, emails, invitations } = await build();

    await useCase.execute({ agentId: "a1" });

    const [message] = emails.sent;
    const token = tokenOf(message.text);
    expect(message.to).toBe("ada@example.com");
    expect(message.text).toContain(`https://app.example.com/invitations/accept?token=${token}`);
    expect(await invitations.consume(token, NOW)).toBeNull();
    expect(await invitations.consume(CryptoUtils.sha256(token), NOW)).toEqual({ agentId: "a1" });
  });

  it("invalidates the previous invitation when reissuing", async () => {
    const { useCase, emails, invitations } = await build();

    await useCase.execute({ agentId: "a1" });
    await useCase.execute({ agentId: "a1" });

    const [first, second] = emails.sent.map((message) => CryptoUtils.sha256(tokenOf(message.text)));
    expect(await invitations.consume(first, NOW)).toBeNull();
    expect(await invitations.consume(second, NOW)).toEqual({ agentId: "a1" });
  });

  it("expires the invitation after the configured ttl", async () => {
    const { useCase, emails, invitations } = await build();

    await useCase.execute({ agentId: "a1" });

    const hash = CryptoUtils.sha256(tokenOf(emails.sent[0].text));
    expect(await invitations.consume(hash, new Date(NOW.getTime() + 24 * 3_600_000))).toBeNull();
  });

  it.each(["active", "disabled"] as const)("sends nothing when the agent is %s", async (status) => {
    const { useCase, emails } = await build(status);

    await useCase.execute({ agentId: "a1" });

    expect(emails.sent).toEqual([]);
  });

  it("sends nothing when the agent no longer exists", async () => {
    const { useCase, emails } = await build();

    await useCase.execute({ agentId: "missing" });

    expect(emails.sent).toEqual([]);
  });
});
