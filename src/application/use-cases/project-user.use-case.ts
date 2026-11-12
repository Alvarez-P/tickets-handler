import { SearchIndex } from "../ports/search-index";
import { UseCase } from "../use-case";
import { User } from "../../domain/entities/user";

export class ProjectUser implements UseCase<User, void> {
  constructor(private readonly index: SearchIndex<User>) {}

  execute(user: User): Promise<void> {
    return this.index.index(user);
  }
}
