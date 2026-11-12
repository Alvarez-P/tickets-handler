import { SearchIndex } from "../ports/search-index";
import { UseCase } from "../use-case";
import { UserRecord } from "../../domain/entities/user";

export class ProjectUser implements UseCase<UserRecord, void> {
  constructor(private readonly index: SearchIndex<UserRecord>) {}

  execute(user: UserRecord): Promise<void> {
    return this.index.index(user);
  }
}
