import { ProjectUser } from "../../src/application/use-cases/project-user.use-case";
import { SearchIndex, SearchResult } from "../../src/application/ports/search-index";
import { User } from "../../src/domain/entities/user";

class FakeIndex implements SearchIndex<User> {
  readonly documents = new Map<string, User>();

  async ensureIndex(): Promise<void> {
    return undefined;
  }

  async index(document: User): Promise<void> {
    this.documents.set(document.id, document);
  }

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async search(): Promise<SearchResult<User>> {
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
    const user: User = { id: "1", email: "ada@example.com", name: "Ada", role: "support-agent", status: "invited" };

    await projection.execute(user);
    await projection.execute(user);

    expect(index.documents.size).toBe(1);
  });
});
