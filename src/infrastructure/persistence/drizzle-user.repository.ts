import { User } from "../../domain/entities/user";
import { DrizzleBaseRepository } from "./drizzle-base.repository";
import { DrizzleClient } from "./drizzle-client";
import { users } from "./schema";

export class DrizzleUserRepository extends DrizzleBaseRepository<User> {
  constructor(client: DrizzleClient) {
    super(client, users);
  }

  async findByEmail(email: string): Promise<User | null> {
    const page = await this.find({ where: { email }, pageSize: 1 });
    return page.items[0] ?? null;
  }
}
