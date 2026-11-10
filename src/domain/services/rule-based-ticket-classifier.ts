import type { Classification } from "../value-objects/classification";
import type { TicketType } from "../value-objects/ticket-type";
import type { Urgency } from "../value-objects/urgency";
import type { TicketClassificationInput, TicketClassifier } from "./ticket-classifier";

type KeywordType = Exclude<TicketType, "other">;

const TYPE_KEYWORDS: Record<KeywordType, readonly string[]> = {
  billing: ["factura", "cobro", "reembolso", "refund", "invoice", "payment", "pago"],
  technical: ["error", "bug", "falla", "crash", "no funciona", "not working"],
  account: ["contrasena", "password", "login", "cuenta", "account", "acceso"],
  shipping: ["envio", "entrega", "paquete", "shipping", "delivery", "tracking"],
};

const CRITICAL_KEYWORDS = ["critico", "critical", "caido", "down"] as const;
const HIGH_KEYWORDS = ["urgente", "urgent", "inmediat"] as const;

const CRITICAL_URGENCY: Urgency = 3;
const HIGH_URGENCY: Urgency = 2;
const DEFAULT_URGENCY: Urgency = 1;
const MATCH_CONFIDENCE = 0.6;
const NO_MATCH_CONFIDENCE = 0.3;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function foundIn(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword));
}

function resolveUrgency(text: string): { urgency: Urgency; tags: string[] } {
  const critical = foundIn(text, CRITICAL_KEYWORDS);
  if (critical.length > 0) return { urgency: CRITICAL_URGENCY, tags: critical };
  const high = foundIn(text, HIGH_KEYWORDS);
  if (high.length > 0) return { urgency: HIGH_URGENCY, tags: high };
  return { urgency: DEFAULT_URGENCY, tags: [] };
}

function resolveType(text: string): { ticketType: TicketType; tags: string[] } {
  let best: { ticketType: TicketType; tags: string[] } = { ticketType: "other", tags: [] };
  for (const ticketType of Object.keys(TYPE_KEYWORDS) as KeywordType[]) {
    const tags = foundIn(text, TYPE_KEYWORDS[ticketType]);
    if (tags.length > best.tags.length) best = { ticketType, tags };
  }
  return best;
}

export class RuleBasedTicketClassifier implements TicketClassifier {
  classify(ticket: TicketClassificationInput): Promise<Classification | null> {
    const text = normalize(`${ticket.subject} ${ticket.description}`);
    const type = resolveType(text);
    const urgency = resolveUrgency(text);
    const tags = [...type.tags, ...urgency.tags];
    return Promise.resolve({
      ticketType: type.ticketType,
      urgency: urgency.urgency,
      tags,
      confidence: type.tags.length > 0 ? MATCH_CONFIDENCE : NO_MATCH_CONFIDENCE,
      source: "rules",
    });
  }
}
