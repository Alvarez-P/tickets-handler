import { ArgsType, Field, Float, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { TicketSearchPage } from "../../../application/use-cases/tickets/search-tickets.use-case";
import { TicketView } from "../../../application/use-cases/tickets/ticket-view.projection";
import { TICKET_PRIORITIES, TicketPriority } from "../../../domain/services/ticket-priority";
import { TICKET_STATUSES, TicketStatus } from "../../../domain/value-objects/ticket-status";
import { TICKET_TYPES, TicketType } from "../../../domain/value-objects/ticket-type";

const enumOf = <TValue extends string>(values: readonly TValue[]): Record<TValue, TValue> =>
  Object.fromEntries(values.map((value) => [value, value])) as Record<TValue, TValue>;

const TicketStatusEnum = enumOf(TICKET_STATUSES);
const TicketTypeEnum = enumOf(TICKET_TYPES);
const TicketPriorityEnum = enumOf(TICKET_PRIORITIES);
const TicketSortFieldEnum = enumOf(["createdAt", "assignedAt", "solvedAt", "urgency"] as const);
const SortOrderEnum = enumOf(["asc", "desc"] as const);

registerEnumType(TicketStatusEnum, { name: "TicketStatus" });
registerEnumType(TicketTypeEnum, { name: "TicketType" });
registerEnumType(TicketPriorityEnum, { name: "TicketPriority" });
registerEnumType(TicketSortFieldEnum, { name: "TicketSortField" });
registerEnumType(SortOrderEnum, { name: "SortOrder" });

@ObjectType("Ticket")
export class TicketObject implements TicketView {
  @Field() id!: string;
  @Field(() => Int) version!: number;
  @Field(() => TicketStatusEnum) status!: TicketStatus;
  @Field() subject!: string;
  @Field() description!: string;
  @Field() customerEmail!: string;
  @Field() customerName!: string;
  @Field() createdBy!: string;
  @Field() createdAt!: string;
  @Field(() => TicketTypeEnum, { nullable: true }) ticketType!: TicketType | null;
  @Field(() => String, { nullable: true }) urgency!: TicketView["urgency"];
  @Field(() => [String]) tags!: readonly string[];
  @Field(() => String, { nullable: true }) classificationSource!: TicketView["classificationSource"];
  @Field(() => Float, { nullable: true }) classificationConfidence!: number | null;
  @Field(() => String, { nullable: true }) classifiedAt!: string | null;
  @Field(() => TicketPriorityEnum, { nullable: true }) priority!: TicketPriority | null;
  @Field(() => String, { nullable: true }) assigneeId!: string | null;
  @Field(() => String, { nullable: true }) assigneeName!: string | null;
  @Field(() => String, { nullable: true }) specialtyId!: string | null;
  @Field(() => String, { nullable: true }) specialtyName!: string | null;
  @Field(() => String, { nullable: true }) assignedAt!: string | null;
  @Field(() => String, { nullable: true }) solvedAt!: string | null;
  @Field(() => String, { nullable: true }) canceledAt!: string | null;
  @Field(() => Float, { nullable: true }) resolutionMinutes!: number | null;
  @Field() needsManualTriage!: boolean;
}

@ObjectType("TicketSearchPage")
export class TicketSearchPageObject implements TicketSearchPage {
  @Field(() => [TicketObject]) items!: TicketObject[];
  @Field(() => Int) total!: number;
}

@ArgsType()
export class SearchTicketsArgs {
  @Field(() => String, { nullable: true }) text?: string;
  @Field(() => TicketStatusEnum, { nullable: true }) status?: TicketStatus;
  @Field(() => String, { nullable: true }) assigneeId?: string;
  @Field(() => TicketTypeEnum, { nullable: true }) ticketType?: TicketType;
  @Field(() => TicketPriorityEnum, { nullable: true }) priority?: TicketPriority;
  @Field(() => TicketSortFieldEnum, { nullable: true }) sortBy?: string;
  @Field(() => SortOrderEnum, { nullable: true }) order?: string;
  @Field(() => Int, { nullable: true }) limit?: number;
  @Field(() => Int, { nullable: true }) offset?: number;
}
