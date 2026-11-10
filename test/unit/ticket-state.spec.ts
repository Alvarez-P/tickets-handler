import { describe, expect, it } from "vitest";
import { stateFor, type TicketState } from "../../src/domain/entities/ticket-state";
import { InvalidTicketTransition } from "../../src/domain/errors/ticket-errors";
import type { TicketStatus } from "../../src/domain/value-objects/ticket-status";

type Action = "assign" | "startSolving" | "pause" | "resume" | "solve" | "cancel";

const ACTIONS: readonly Action[] = ["assign", "startSolving", "pause", "resume", "solve", "cancel"];

const TRANSITIONS: Record<TicketStatus, Partial<Record<Action, TicketStatus>>> = {
  received: { assign: "assigned", cancel: "canceled" },
  assigned: { startSolving: "solving", cancel: "canceled" },
  solving: { pause: "paused", solve: "solved", cancel: "canceled" },
  paused: { resume: "solving", cancel: "canceled" },
  solved: {},
  canceled: {},
};

const STATUSES = Object.keys(TRANSITIONS) as TicketStatus[];

const MATRIX = STATUSES.flatMap((from) =>
  ACTIONS.map((action) => ({ from, action, expected: TRANSITIONS[from][action] ?? null })),
);

function run(state: TicketState, action: Action): TicketState {
  return state[action]();
}

describe("TicketState", () => {
  it.each(MATRIX)("$from + $action -> $expected", ({ from, action, expected }) => {
    const state = stateFor(from);
    if (expected === null) {
      expect(() => run(state, action)).toThrow(InvalidTicketTransition);
      return;
    }
    expect(run(state, action).status).toBe(expected);
  });

  it.each(STATUSES)("%s reports its status and finality", (status) => {
    const state = stateFor(status);
    expect(state.status).toBe(status);
    expect(state.isFinal).toBe(status === "solved" || status === "canceled");
  });

  it("exposes from and action in the error", () => {
    const error = (() => {
      try {
        stateFor("solved").assign();
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(InvalidTicketTransition);
    expect(error).toMatchObject({ code: "invalid_ticket_transition", from: "solved", action: "assign" });
  });
});
