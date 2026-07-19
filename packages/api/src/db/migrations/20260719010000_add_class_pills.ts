import { type Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("classes")
    .addColumn("pills", "jsonb", (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`)
    )
    .execute();

  await sql`
    update classes
    set pills = (
      select coalesce(jsonb_agg(value), '[]'::jsonb)
      from (
        values
          (nullif(btrim(title), '')),
          (nullif(btrim(description), ''))
      ) as existing(value)
      where value is not null
        and lower(value) <> 'description goes here'
        and value !~* '^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) - (January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}$'
    )
  `.execute(db);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.alterTable("classes").dropColumn("pills").execute();
};
