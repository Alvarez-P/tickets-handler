import { SearchIndex, SearchOptions } from "../../ports/search-index";
import { UseCase } from "../../use-case";
import { TicketView } from "./ticket-view.projection";

export interface SearchTicketsInput extends SearchOptions {
  text?: string;
}

export interface TicketSearchPage {
  items: TicketView[];
  total: number;
}

export class SearchTickets implements UseCase<SearchTicketsInput, TicketSearchPage> {
  constructor(private readonly index: SearchIndex<TicketView>) {}

  async execute({ text = "", ...options }: SearchTicketsInput): Promise<TicketSearchPage> {
    const { hits, total } = await this.index.search(text, options);
    return { items: hits.map((hit) => hit.document), total };
  }
}
