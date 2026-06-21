import { type Kysely, sql } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .createTable("users")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("firebase_uid", "text", (col) => col.notNull().unique())
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("display_name", "text", (col) => col.notNull())
    .addColumn("photo_url", "text")
    .addColumn("role", "varchar(20)", (col) => col.notNull().defaultTo("member"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("classes")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("date", "text", (col) => col.notNull())
    .addColumn("time", "text")
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("draft"))
    .addColumn("grid_published", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("created_by", "text", (col) => col.notNull().references("users.id"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("signups")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("class_id", "text", (col) => col.notNull().references("classes.id"))
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id"))
    .addColumn("rsvp", "varchar(10)", (col) => col.notNull().defaultTo("none"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("badges")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("text", "text", (col) => col.notNull())
    .addColumn("group", "text")
    .addColumn("color", "varchar(30)", (col) => col.notNull())
    .execute();

  await db.schema
    .createTable("grid_entries")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("class_id", "text", (col) => col.notNull().references("classes.id"))
    .addColumn("order", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("badge_id", "text", (col) => col.references("badges.id"))
    .addColumn("time", "text")
    .addColumn("description", "text")
    .addColumn("instructor_ids", "jsonb", (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .execute();

  await db.schema
    .createTable("chats")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("title", "text")
    .addColumn("topic_id", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("chat_messages")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("chat_id", "text", (col) => col.notNull().references("chats.id"))
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id"))
    .addColumn("text", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("chat_members")
    .addColumn("id", "text", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("chat_id", "text", (col) => col.notNull().references("chats.id"))
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id"))
    .addColumn("joined_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.dropTable("chat_members").execute();
  await db.schema.dropTable("chat_messages").execute();
  await db.schema.dropTable("chats").execute();
  await db.schema.dropTable("grid_entries").execute();
  await db.schema.dropTable("badges").execute();
  await db.schema.dropTable("signups").execute();
  await db.schema.dropTable("classes").execute();
  await db.schema.dropTable("users").execute();
};
