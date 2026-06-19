import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { Database } from "./types.js";

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  }),
});

export const db = new Kysely<Database>({ dialect });
