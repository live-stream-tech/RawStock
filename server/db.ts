import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, type NodePgDatabase, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

type AppSchema = typeof schema;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

/** DB 本体と `transaction` 内の `tx` を同じ引数型で渡すための共用型 */
export type DbOrTx =
  | NodePgDatabase<AppSchema>
  | PgTransaction<NodePgQueryResultHKT, AppSchema, ExtractTablesWithRelations<AppSchema>>;
