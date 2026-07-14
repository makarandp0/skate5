import { type Kysely } from "kysely";

const defaultLocationSlug = "lynnwood-bowl-and-skate";

const locations = [
  {
    slug: defaultLocationSlug,
    name: "Lynnwood Bowl and Skate",
    address: "6210 200th St SW, Lynnwood, WA 98036",
    color: "#2563eb",
    sortOrder: 0,
  },
  {
    slug: "rock-and-roll-rink-issaquah",
    name: "Rock and Roll Rink - Issaquah",
    address: "5700 E Lake Sammamish Pkwy SE, Issaquah, WA 98029",
    color: "#16a34a",
    sortOrder: 1,
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .createTable("locations")
    .addColumn("slug", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("address", "text", (col) => col.notNull())
    .addColumn("color", "varchar(30)", (col) => col.notNull())
    .addColumn("active", "boolean", (col) => col.notNull().defaultTo(true))
    .addColumn("sort_order", "integer", (col) => col.notNull().defaultTo(0))
    .execute();

  await db
    .insertInto("locations")
    .values(
      locations.map((location) => ({
        slug: location.slug,
        name: location.name,
        address: location.address,
        color: location.color,
        sort_order: location.sortOrder,
      }))
    )
    .execute();

  await db.schema
    .alterTable("classes")
    .addColumn("location_slug", "text", (col) =>
      col.references("locations.slug").defaultTo(defaultLocationSlug)
    )
    .execute();

  await db
    .updateTable("classes")
    .set({ location_slug: defaultLocationSlug })
    .where("location_slug", "is", null)
    .execute();

  await db.schema
    .alterTable("classes")
    .alterColumn("location_slug", (col) => col.setNotNull())
    .execute();

  await db.schema
    .alterTable("classes")
    .alterColumn("location_slug", (col) => col.dropDefault())
    .execute();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema.alterTable("classes").dropColumn("location_slug").execute();
  await db.schema.dropTable("locations").execute();
};
