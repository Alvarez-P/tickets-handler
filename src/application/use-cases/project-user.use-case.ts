import { SearchIndex } from "../../shared/contracts/search-index";
import { UseCase } from "../../shared/contracts/use-case";
import { UserRecord } from "../../shared/contracts/user-record";

export class ProjectUser implements UseCase<UserRecord, void> {
  constructor(private readonly index: SearchIndex<UserRecord>) {}

  execute(user: UserRecord): Promise<void> {
    return this.index.index(user);
  }
}
