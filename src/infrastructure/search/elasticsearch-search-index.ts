import { Client } from "@elastic/elasticsearch";
import { SearchIndex, SearchOptions, SearchResult } from "../../shared/contracts/search-index";

export interface IndexDefinition {
  name: string;
  searchFields: string[];
  properties: Record<string, object>;
}

const DEFAULT_LIMIT = 20;

export class ElasticsearchSearchIndex<TDocument extends { id: string }> implements SearchIndex<TDocument> {
  constructor(
    private readonly client: Client,
    private readonly definition: IndexDefinition,
  ) {}

  async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: this.definition.name });
    if (!exists) {
      await this.client.indices.create({
        index: this.definition.name,
        mappings: { properties: this.definition.properties },
      });
    }
  }

  async index(document: TDocument): Promise<void> {
    await this.client.index({ index: this.definition.name, id: document.id, document, refresh: "wait_for" });
  }

  async remove(id: string): Promise<void> {
    await this.client.delete({ index: this.definition.name, id, refresh: "wait_for" }, { ignore: [404] });
  }

  async search(text: string, options: SearchOptions = {}): Promise<SearchResult<TDocument>> {
    const filters = Object.entries(options.filters ?? {}).map(([field, value]) => ({ term: { [field]: value } }));
    const response = await this.client.search<TDocument>({
      index: this.definition.name,
      from: options.offset ?? 0,
      size: options.limit ?? DEFAULT_LIMIT,
      track_total_hits: true,
      ...(options.sort
        ? {
            sort: [
              { [options.sort.field]: { order: options.sort.direction, missing: "_last" } },
              { id: { order: "asc" as const } },
            ],
          }
        : {}),
      query: {
        bool: {
          must: text
            ? [{ multi_match: { query: text, fields: this.definition.searchFields, fuzziness: "AUTO" } }]
            : [{ match_all: {} }],
          filter: filters,
        },
      },
    });
    const total = response.hits.total;
    return {
      total: typeof total === "number" ? total : (total?.value ?? 0),
      hits: response.hits.hits.flatMap((hit) =>
        hit._source ? [{ id: String(hit._id), score: hit._score ?? 0, document: hit._source }] : [],
      ),
    };
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
