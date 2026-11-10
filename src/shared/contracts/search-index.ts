export interface SearchHit<TDocument> {
  id: string;
  score: number;
  document: TDocument;
}

export interface SearchResult<TDocument> {
  hits: SearchHit<TDocument>[];
  total: number;
}

export interface SearchSort {
  field: string;
  direction: "asc" | "desc";
}

export interface SearchOptions {
  sort?: SearchSort;
  limit?: number;
  offset?: number;
  filters?: Readonly<Record<string, string>>;
}

export interface SearchIndex<TDocument extends { id: string }> {
  ensureIndex(): Promise<void>;
  index(document: TDocument): Promise<void>;
  remove(id: string): Promise<void>;
  search(text: string, options?: SearchOptions): Promise<SearchResult<TDocument>>;
  close(): Promise<void>;
}
