import { type Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .createTable("system_events")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("type", "varchar(80)", (col) => col.notNull())
    .addColumn("actor_user_id", "text", (col) => col.references("users.id"))
    .addColumn("subject_user_id", "text", (col) => col.references("users.id"))
    .addColumn("entity_type", "varchar(40)")
    .addColumn("entity_id", "text")
    .addColumn("summary", "text", (col) => col.notNull())
    .addColumn("metadata", "jsonb", (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn("occurred_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("system_events_occurred_at_idx")
    .on("system_events")
    .column("occurred_at")
    .execute();

  await db.schema
    .createIndex("system_events_type_idx")
    .on("system_events")
    .column("type")
    .execute();

  await db.schema
    .createIndex("system_events_actor_user_id_idx")
    .on("system_events")
    .column("actor_user_id")
    .execute();

  await db.schema
    .createIndex("system_events_subject_user_id_idx")
    .on("system_events")
    .column("subject_user_id")
    .execute();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.dropIndex("system_events_subject_user_id_idx").execute();
  await db.schema.dropIndex("system_events_actor_user_id_idx").execute();
  await db.schema.dropIndex("system_events_type_idx").execute();
  await db.schema.dropIndex("system_events_occurred_at_idx").execute();
  await db.schema.dropTable("system_events").execute();
};
