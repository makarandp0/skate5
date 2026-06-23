import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { config } from "../config.js";
import { Database } from "./types.js";

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: config.databaseUrl,
  }),
});

export const db = new Kysely<Database>({ dialect });

export const checkDatabaseConnection = async (): Promise<void> => {
  await sql`select 1`.execute(db);
};
