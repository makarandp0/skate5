import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { Migrator, FileMigrationProvider } from "kysely";
import { db } from "./index.js";
import { config } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFolder = path.join(__dirname, "migrations");

const databaseErrorSchema = z.object({
  code: z.string().optional(),
  errno: z.number().optional(),
  syscall: z.string().optional(),
  address: z.string().optional(),
  port: z.number().optional(),
  hostname: z.string().optional(),
});

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
});

const getDatabaseTarget = (): string => {
  const url = new URL(config.databaseUrl);
  const port = url.port ? `:${url.port}` : "";
  const database = url.pathname || "/";
  return `${url.protocol}//${url.hostname}${port}${database}`;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const logDatabaseErrorDetails = (error: unknown): void => {
  const parsed = databaseErrorSchema.safeParse(error);
  if (!parsed.success) return;

  const details = parsed.data;
  const parts = [
    details.code ? `code=${details.code}` : null,
    details.errno !== undefined ? `errno=${String(details.errno)}` : null,
    details.syscall ? `syscall=${details.syscall}` : null,
    details.address ? `address=${details.address}` : null,
    details.hostname ? `hostname=${details.hostname}` : null,
    details.port !== undefined ? `port=${String(details.port)}` : null,
  ].filter((value) => value !== null);

  if (parts.length > 0) {
    console.error(`Database error details: ${parts.join(" ")}`);
  }
};

const failMigration = (error: unknown): void => {
  console.error("FATAL startup: database migration failed.");
  console.error(`Database target: ${getDatabaseTarget()}`);
  console.error(`Migration folder: ${migrationFolder}`);
  console.error(`Cause: ${getErrorMessage(error)}`);
  logDatabaseErrorDetails(error);
  console.error(
    "Check DATABASE_URL, Railway Postgres status, network reachability, and the failing migration above."
  );
};

try {
  console.log(`Database target: ${getDatabaseTarget()}`);
  console.log(`Migration folder: ${migrationFolder}`);

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`✓ ${it.migrationName}`);
    } else if (it.status === "Error") {
      console.error(`✗ ${it.migrationName}`);
    }
  });

  if (error) {
    failMigration(error);
    process.exitCode = 1;
  } else if (!results?.length) {
    console.log("No pending migrations.");
  }
} catch (error) {
  failMigration(error);
  process.exitCode = 1;
} finally {
  await db.destroy();
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
