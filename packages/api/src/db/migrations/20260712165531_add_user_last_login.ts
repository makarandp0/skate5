import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("users")
    .addColumn("last_login_at", "timestamptz")
    .execute();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("users")
    .dropColumn("last_login_at")
    .execute();
};
