import { type Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("grid_entries")
    .addColumn("class_text", "text")
    .addColumn("notes", "text")
    .execute();

  await sql`
    update grid_entries as ge
    set
      class_text = nullif(
        btrim(concat_ws(': ', nullif(b.group, ''), nullif(b.text, ''))),
        ''
      ),
      notes = nullif(ge.description, '')
    from badges as b
    where ge.badge_id = b.id
  `.execute(db);

  await sql`
    update grid_entries
    set class_text = nullif(description, '')
    where class_text is null
  `.execute(db);

  await db.schema
    .alterTable("grid_entries")
    .dropColumn("badge_id")
    .dropColumn("description")
    .execute();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("grid_entries")
    .addColumn("badge_id", "text", (col) => col.references("badges.id"))
    .addColumn("description", "text")
    .execute();

  await sql`
    update grid_entries
    set description = coalesce(nullif(notes, ''), nullif(class_text, ''))
  `.execute(db);

  await db.schema
    .alterTable("grid_entries")
    .dropColumn("notes")
    .dropColumn("class_text")
    .execute();
};
