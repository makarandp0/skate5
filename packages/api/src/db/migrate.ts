import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Migrator, FileMigrationProvider } from "kysely";
import { db } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, "migrations"),
  }),
});

const { error, results } = await migrator.migrateToLatest();

results?.forEach((it) => {
  if (it.status === "Success") {
    console.log(`✓ ${it.migrationName}`);
  } else if (it.status === "Error") {
    console.error(`✗ ${it.migrationName}`);
  }
});

if (error) {
  console.error("Migration failed:", error);
  process.exit(1);
}

if (!results?.length) {
  console.log("No pending migrations.");
}

await db.destroy();
