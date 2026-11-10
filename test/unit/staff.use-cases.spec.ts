import { FakeCacheInvalidator } from "../../src/shared/testing/fake-cache-invalidator";
import { CreateAgent } from "../../src/application/use-cases/staff/create-agent.use-case";
import { CreateSpecialty } from "../../src/application/use-cases/staff/create-specialty.use-case";
import { SetSpecialtyActive } from "../../src/application/use-cases/staff/set-specialty-active.use-case";
import { UpdateAgent } from "../../src/application/use-cases/staff/update-agent.use-case";
import {
  ActiveSpecialtyExistsForType,
  EmailAlreadyRegistered,
  InvalidAgentRole,
  InvalidAgentStatusTransition,
  SpecialistRequiresSpecialties,
  SpecialtyCodeTaken,
  SpecialtyNotFound,
} from "../../src/domain/errors/staff-errors";
import { AgentCreated } from "../../src/domain/events/staff-events";
import { correlationContext } from "../../src/shared/observability/correlation-context";
import {
  InMemoryAgentRepository,
  InMemorySpecialtyRepository,
  InMemoryStaffUnitOfWork,
} from "../../src/shared/testing/in-memory-staff";

const buildStaff = () => {
  const agents = new InMemoryAgentRepository();
  const specialties = new InMemorySpecialtyRepository();
  const unitOfWork = new InMemoryStaffUnitOfWork(agents, specialties);
  return {
    agents,
    specialties,
    unitOfWork,
    createSpecialty: new CreateSpecialty(specialties),
    setSpecialtyActive: new SetSpecialtyActive(specialties),
    createAgent: new CreateAgent(unitOfWork),
    updateAgent: new UpdateAgent(unitOfWork, new FakeCacheInvalidator()),
  };
};

const billing = { code: "billing-l1", name: "Billing", ticketType: "billing" } as const;

describe("CreateSpecialty", () => {
  it("rejects a duplicated code", async () => {
    const { createSpecialty } = buildStaff();
    await createSpecialty.execute(billing);

    await expect(createSpecialty.execute({ ...billing, ticketType: "technical" })).rejects.toBeInstanceOf(SpecialtyCodeTaken);
  });

  it("rejects a second active specialty for the same ticket type", async () => {
    const { createSpecialty } = buildStaff();
    await createSpecialty.execute(billing);

    await expect(createSpecialty.execute({ ...billing, code: "billing-l2" })).rejects.toBeInstanceOf(
      ActiveSpecialtyExistsForType,
    );
  });
});

describe("SetSpecialtyActive", () => {
  it("rejects activating a specialty when another one is active for the type", async () => {
    const { createSpecialty, setSpecialtyActive } = buildStaff();
    await createSpecialty.execute(billing);
    const second = await createSpecialty.execute({ ...billing, code: "billing-l2", active: false });

    await expect(setSpecialtyActive.execute({ id: second.id, active: true })).rejects.toBeInstanceOf(
      ActiveSpecialtyExistsForType,
    );
  });

  it("swaps the active specialty after deactivating the current one", async () => {
    const { createSpecialty, setSpecialtyActive } = buildStaff();
    const first = await createSpecialty.execute(billing);
    const second = await createSpecialty.execute({ ...billing, code: "billing-l2", active: false });

    await setSpecialtyActive.execute({ id: first.id, active: false });

    expect(await setSpecialtyActive.execute({ id: second.id, active: true })).toMatchObject({ active: true });
  });

  it("fails for an unknown specialty", async () => {
    await expect(buildStaff().setSpecialtyActive.execute({ id: "missing", active: true })).rejects.toBeInstanceOf(
      SpecialtyNotFound,
    );
  });
});

describe("CreateAgent", () => {
  const setup = async () => {
    const staff = buildStaff();
    const specialty = await staff.createSpecialty.execute(billing);
    return { ...staff, specialty };
  };

  it("stores an invited agent, its specialties and one agent.created message without personal data", async () => {
    const { createAgent, agents, unitOfWork, specialty } = await setup();

    const agent = await correlationContext.run("corr-1", () =>
      createAgent.execute({
        email: "ada@example.com",
        name: "Ada",
        role: "specialist-agent",
        specialtyIds: [specialty.id, specialty.id],
      }),
    );

    expect(agent).toMatchObject({ status: "invited", role: "specialist-agent", specialtyIds: [specialty.id] });
    expect(await agents.findWithSpecialties(agent.id)).toEqual(agent);
    expect(unitOfWork.outbox.messages).toHaveLength(1);
    const [message] = unitOfWork.outbox.messages;
    expect(message.topic).toBe("staff.events");
    expect(message.payload).toMatchObject({
      type: "agent.created",
      agentId: agent.id,
      role: "specialist-agent",
      specialtyIds: [specialty.id],
      correlationId: "corr-1",
    } satisfies Partial<AgentCreated>);
    expect(JSON.stringify(message.payload)).not.toMatch(/ada|example\.com/i);
  });

  it("rejects a duplicated email", async () => {
    const { createAgent } = await setup();
    const input = { email: "ada@example.com", name: "Ada", role: "support-agent" as const, specialtyIds: [] };
    await createAgent.execute(input);

    await expect(createAgent.execute(input)).rejects.toBeInstanceOf(EmailAlreadyRegistered);
  });

  it("rejects the admin role", async () => {
    const { createAgent } = await setup();

    await expect(
      createAgent.execute({ email: "root@example.com", name: "Root", role: "admin", specialtyIds: [] }),
    ).rejects.toBeInstanceOf(InvalidAgentRole);
  });

  it("requires specialties for a specialist", async () => {
    const { createAgent, unitOfWork } = await setup();

    await expect(
      createAgent.execute({ email: "a@example.com", name: "A", role: "specialist-agent", specialtyIds: [] }),
    ).rejects.toBeInstanceOf(SpecialistRequiresSpecialties);
    expect(unitOfWork.outbox.messages).toHaveLength(0);
  });

  it("rejects inactive and unknown specialties", async () => {
    const { createAgent, setSpecialtyActive, specialty } = await setup();
    await setSpecialtyActive.execute({ id: specialty.id, active: false });
    const input = { email: "a@example.com", name: "A", role: "specialist-agent" } as const;

    await expect(createAgent.execute({ ...input, specialtyIds: [specialty.id] })).rejects.toBeInstanceOf(SpecialtyNotFound);
    await expect(createAgent.execute({ ...input, specialtyIds: ["missing"] })).rejects.toBeInstanceOf(SpecialtyNotFound);
  });
});

describe("UpdateAgent", () => {
  const setup = async () => {
    const staff = buildStaff();
    const specialty = await staff.createSpecialty.execute(billing);
    const technical = await staff.createSpecialty.execute({ code: "tech", name: "Tech", ticketType: "technical" });
    const agent = await staff.createAgent.execute({
      email: "ada@example.com",
      name: "Ada",
      role: "specialist-agent",
      specialtyIds: [specialty.id],
    });
    return { ...staff, specialty, technical, agent };
  };

  it("does not let an invited agent change status", async () => {
    const { updateAgent, agent } = await setup();

    await expect(updateAgent.execute({ id: agent.id, status: "active" })).rejects.toBeInstanceOf(InvalidAgentStatusTransition);
  });

  it("toggles between active and disabled", async () => {
    const { updateAgent, agents, agent } = await setup();
    await agents.save({ id: agent.id, email: agent.email, name: agent.name, role: agent.role, status: "active" });

    expect(await updateAgent.execute({ id: agent.id, status: "disabled" })).toMatchObject({ status: "disabled" });
    expect(await updateAgent.execute({ id: agent.id, status: "active" })).toMatchObject({ status: "active" });
  });

  it("replaces the specialty set and renames the agent", async () => {
    const { updateAgent, technical, agent } = await setup();

    const updated = await updateAgent.execute({ id: agent.id, name: "Ada L.", specialtyIds: [technical.id] });

    expect(updated).toMatchObject({ name: "Ada L.", specialtyIds: [technical.id] });
  });

  it("rejects clearing the specialties of a specialist", async () => {
    const { updateAgent, agent } = await setup();

    await expect(updateAgent.execute({ id: agent.id, specialtyIds: [] })).rejects.toBeInstanceOf(SpecialistRequiresSpecialties);
  });

  it("rejects promoting a support agent without specialties to specialist", async () => {
    const { updateAgent, createAgent } = await setup();
    const support = await createAgent.execute({ email: "s@example.com", name: "S", role: "support-agent", specialtyIds: [] });

    await expect(updateAgent.execute({ id: support.id, role: "specialist-agent" })).rejects.toBeInstanceOf(
      SpecialistRequiresSpecialties,
    );
  });
});
