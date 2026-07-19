import { type Kysely } from "kysely";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("locations")
    .addColumn("short_name", "text")
    .execute();

  await db
    .updateTable("locations")
    .set({ short_name: "Lynnwood" })
    .where("slug", "=", "lynnwood-bowl-and-skate")
    .execute();

  await db
    .updateTable("locations")
    .set({ short_name: "Issaquah" })
    .where("slug", "=", "rock-and-roll-rink-issaquah")
    .execute();

  await db
    .updateTable("locations")
    .set((eb) => ({ short_name: eb.ref("name") }))
    .where("short_name", "is", null)
    .execute();

  await db.schema
    .alterTable("locations")
    .alterColumn("short_name", (col) => col.setNotNull())
    .execute();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.alterTable("locations").dropColumn("short_name").execute();
};
