import { describe, expect, it } from "vitest";
import { RuleBasedTicketClassifier } from "../../src/domain/services/rule-based-ticket-classifier";

const classifier = new RuleBasedTicketClassifier();

describe("RuleBasedTicketClassifier", () => {
  it.each([
    ["Problema con mi factura", "billing"],
    ["I need a refund", "billing"],
    ["Hay un error en la app", "technical"],
    ["The app is not working", "technical"],
    ["No recuerdo mi contraseña", "account"],
    ["Cannot login to my account", "account"],
    ["Mi paquete no llega, envio retrasado", "shipping"],
    ["Where is my delivery", "shipping"],
  ])("classifies %s as %s", async (subject, expected) => {
    const result = await classifier.classify({ subject, description: "" });
    expect(result).toMatchObject({ ticketType: expect.any(String), source: "rules", confidence: 0.6 });
    expect(result?.ticketType).toBe(expected);
    expect(result?.tags.length).toBeGreaterThan(0);
  });

  it.each([
    ["Servicio caido", 3],
    ["It is critical", 3],
    ["Es urgente", 2],
    ["Need this urgent", 2],
    ["Respuesta inmediata por favor", 2],
    ["Hola", 1],
  ])("urgency of %s is %i", async (subject, urgency) => {
    const result = await classifier.classify({ subject, description: "" });
    expect(result?.urgency).toBe(urgency);
  });

  it("falls back to other with low confidence", async () => {
    const result = await classifier.classify({ subject: "Hola", description: "Quisiera saludar" });
    expect(result).toEqual({
      ticketType: "other",
      urgency: 1,
      tags: [],
      confidence: 0.3,
      source: "rules",
    });
  });

  it("uses subject and description together", async () => {
    const result = await classifier.classify({ subject: "Ayuda", description: "Error de pago urgente" });
    expect(result?.ticketType).toBe("billing");
    expect(result?.urgency).toBe(2);
    expect(result?.tags).toEqual(expect.arrayContaining(["pago", "urgente"]));
  });
});
