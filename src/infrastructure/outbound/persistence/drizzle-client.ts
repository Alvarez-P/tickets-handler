
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const createDrizzleClient = (connectionString: string) => drizzle(new Pool({ connectionString }), { schema });

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
