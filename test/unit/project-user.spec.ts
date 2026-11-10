import { ProjectUser } from "../../src/application/use-cases/project-user.use-case";
import { SearchIndex, SearchResult } from "../../src/shared/contracts/search-index";
import { UserRecord } from "../../src/shared/contracts/user-record";

class FakeIndex implements SearchIndex<UserRecord> {
  readonly documents = new Map<string, UserRecord>();

  async ensureIndex(): Promise<void> {
    return undefined;
  }

  async index(document: UserRecord): Promise<void> {
    this.documents.set(document.id, document);
  }

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async search(): Promise<SearchResult<UserRecord>> {
    return { hits: [], total: 0 };
  }

  async close(): Promise<void> {
    return undefined;
  }
}

describe("ProjectUser", () => {
  it("writes the user to the read model", async () => {
    const index = new FakeIndex();

    await new ProjectUser(index).execute({ id: "1", email: "ada@example.com", name: "Ada", role: "support-agent", status: "invited" });

    expect(index.documents.get("1")?.email).toBe("ada@example.com");
  });

  it("is idempotent when the same event is delivered twice", async () => {
    const index = new FakeIndex();
    const projection = new ProjectUser(index);
    const user: UserRecord = { id: "1", email: "ada@example.com", name: "Ada", role: "support-agent", status: "invited" };

    await projection.execute(user);
    await projection.execute(user);

    expect(index.documents.size).toBe(1);
  });
});
