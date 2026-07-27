import { type Kysely } from "kysely";

type ClassDateRow = {
  id: string;
  date: string;
};

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}/;
const classDateTimeZone = "America/Los_Angeles";
const classDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: classDateTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const toClassTimeZoneDateKey = (date: Date): string => {
  return classDateFormatter.format(date);
};

const isValidDateKey = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const toClassDateKey = (row: ClassDateRow): string => {
  if (row.date.includes("T")) {
    const parsed = new Date(row.date);
    if (!Number.isNaN(parsed.getTime())) {
      return toClassTimeZoneDateKey(parsed);
    }
  }

  const dateKey = dateKeyPattern.exec(row.date)?.[0];
  if (dateKey && isValidDateKey(dateKey)) {
    return dateKey;
  }

  const parsed = new Date(row.date);
  if (!Number.isNaN(parsed.getTime())) {
    return toClassTimeZoneDateKey(parsed);
  }

  throw new Error(
    `Cannot migrate classes.date for class ${row.id}: expected a parseable date, received "${row.date}"`
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const up = async (db: Kysely<any>): Promise<void> => {
  await db.schema.alterTable("classes").addColumn("date_value", "date").execute();

  const rows = await db.selectFrom("classes").select(["id", "date"]).execute();
  for (const row of rows) {
    await db
      .updateTable("classes")
      .set({ date_value: toClassDateKey(row) })
      .where("id", "=", row.id)
      .execute();
  }

  await db.schema.alterTable("classes").dropColumn("date").execute();
  await db.schema
    .alterTable("classes")
    .renameColumn("date_value", "date")
    .execute();
  await db.schema
    .alterTable("classes")
    .alterColumn("date", (col) => col.setNotNull())
    .execute();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely migration interface requires Kysely<any>
export const down = async (db: Kysely<any>): Promise<void> => {
  await db.schema
    .alterTable("classes")
    .alterColumn("date", (col) => col.setDataType("text"))
    .execute();
};
