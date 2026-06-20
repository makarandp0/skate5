import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { config } from "../config.js";
import { Database } from "./types.js";

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: config.databaseUrl,
  }),
});

export const db = new Kysely<Database>({ dialect });
