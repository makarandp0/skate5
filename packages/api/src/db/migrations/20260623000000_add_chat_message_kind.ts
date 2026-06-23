import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("chat_messages")
    .addColumn("kind", "varchar(20)", (col) => col.notNull().defaultTo("user"))
    .execute();

  await db.schema
    .createIndex("chats_topic_id_unique")
    .on("chats")
    .column("topic_id")
    .unique()
    .where("topic_id", "is not", null)
    .execute();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.dropIndex("chats_topic_id_unique").execute();

  await db.schema.alterTable("chat_messages").dropColumn("kind").execute();
};
