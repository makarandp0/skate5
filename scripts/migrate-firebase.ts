/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-argument */
// One-time migration script — type assertions needed for dynamic JSON processing.

import { config } from "dotenv";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import { z } from "zod";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "../packages/api/src/db/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from packages/api/.env unless DATABASE_URL is already set
if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(__dirname, "../packages/api/.env") });
}

// --- Zod schemas for Firebase export ---

const firebaseUserSchema = z.object({
  displayName: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  provider: z.string().optional(),
  uid: z.string(),
  role: z.enum(["admin", "instructor"]).optional(),
});

const firebaseClassSchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  description: z.string().optional(),
  time: z.string().optional(),
  status: z.enum(["OPEN", "CLOSED"]),
  instructors: z.union([z.record(z.string(), z.string()), z.array(z.string())]).optional(),
  gridPublished: z.boolean().optional(),
});

const firebaseSignupSchema = z.object({
  userId: z.string(),
  classId: z.string(),
  rsvp: z.string(),
});

const firebaseBadgeSchema = z.object({
  id: z.string(),
  text: z.string(),
  group: z.string().optional(),
  color: z.string(),
});

const firebaseGridEntrySchema = z.object({
  id: z.string().optional(),
  order: z.number().optional(),
  classId: z.string().optional(),
  time: z.string().optional(),
  badge: z.string().optional(),
  description: z.string().optional(),
  instructors: z.union([z.record(z.string(), z.string()), z.array(z.string())]).optional(),
});

const firebaseExportSchema = z.object({
  users: z.record(z.string(), firebaseUserSchema).optional().default({}),
  classes: z.record(z.string(), firebaseClassSchema).optional().default({}),
  signups: z.record(z.string(), z.record(z.string(), firebaseSignupSchema)).optional().default({}),
  badges: z.record(z.string(), firebaseBadgeSchema).optional().default({}),
  grids: z.record(z.string(), z.record(z.string(), firebaseGridEntrySchema)).optional().default({}),
});

// --- Helpers ---

function maskConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return url.replace(/:[^:@]+@/, ":***@");
  }
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

function getInstructorArray(instructors: Record<string, string> | string[] | undefined): string[] {
  if (!instructors) return [];
  if (Array.isArray(instructors)) return instructors;
  return Object.values(instructors);
}

// --- Main ---

const args = process.argv.slice(2);
const jsonPath = args.find((a) => !a.startsWith("--"));
const forceFlag = args.includes("--force");

if (!jsonPath) {
  console.error("Usage: tsx scripts/migrate-firebase.ts <path-to-export.json> [--force]");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set. Set it in packages/api/.env or pass it inline.");
  process.exit(1);
}

// Set up DB connection
const dialect = new PostgresDialect({ pool: new pg.Pool({ connectionString }) });
const db = new Kysely<Database>({ dialect });

// Read and validate JSON
console.log(`Reading ${jsonPath}...`);
const rawJson = await readFile(path.resolve(jsonPath), "utf-8");
const parsed: unknown = JSON.parse(rawJson);
const data = firebaseExportSchema.parse(parsed);

// Count entities
const userEntries = Object.entries(data.users);
const badgeEntries = Object.entries(data.badges);
const classEntries = Object.entries(data.classes);
const signupEntries = Object.entries(data.signups).flatMap(([classId, users]) =>
  Object.entries(users).map(([userId, signup]) => ({ classId, userId, ...signup }))
);
const gridEntries = Object.entries(data.grids)
  .filter(([classId]) => classId !== "undefined")
  .flatMap(([classId, entries]) =>
    Object.entries(entries)
      .filter(([, entry]) => entry.classId !== undefined)
      .map(([entryId, entry]) => ({ classId, entryId, ...entry }))
  );

// Show confirmation
console.log(`\nTarget: ${maskConnectionString(connectionString)}`);
console.log(`Data to import:`);
console.log(`  Users:        ${String(userEntries.length)}`);
console.log(`  Badges:       ${String(badgeEntries.length)}`);
console.log(`  Classes:      ${String(classEntries.length)}`);
console.log(`  Signups:      ${String(signupEntries.length)}`);
console.log(`  Grid entries: ${String(gridEntries.length)}`);
if (forceFlag) {
  console.log(`\n  ⚠️  --force: existing data will be DELETED before import`);
}
console.log("");

const proceed = await confirm("Continue? (y/n) ");
if (!proceed) {
  console.log("Aborted.");
  await db.destroy();
  process.exit(0);
}

// Check existing data
const userCount = await db.selectFrom("users").select(db.fn.countAll().as("count")).executeTakeFirstOrThrow();
if (Number(userCount.count) > 0 && !forceFlag) {
  console.error("\n❌ Database already has data. Use --force to delete existing data first.");
  await db.destroy();
  process.exit(1);
}

// Run migration in a transaction
await db.transaction().execute(async (trx) => {
  // If --force, clear tables in reverse FK order
  if (forceFlag) {
    console.log("Deleting existing data...");
    await trx.deleteFrom("grid_entries").execute();
    await trx.deleteFrom("signups").execute();
    await trx.deleteFrom("classes").execute();
    await trx.deleteFrom("badges").execute();
    await trx.deleteFrom("chat_members").execute();
    await trx.deleteFrom("chat_messages").execute();
    await trx.deleteFrom("chats").execute();
    await trx.deleteFrom("users").execute();
  }

  // Phase 1: Users
  console.log(`Inserting ${String(userEntries.length)} users...`);
  const uidMap = new Map<string, string>();

  for (const [firebaseUid, user] of userEntries) {
    const result = await trx
      .insertInto("users")
      .values({
        firebase_uid: firebaseUid,
        email: user.email ?? `${firebaseUid}@unknown.com`,
        display_name: user.displayName ?? "Unknown",
        photo_url: user.photoURL ?? null,
        role: user.role ?? "member",
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();
    uidMap.set(firebaseUid, result.id);
  }

  // Phase 2: Badges
  console.log(`Inserting ${String(badgeEntries.length)} badges...`);
  const badgeMap = new Map<string, string>(); // "text|group" → postgres ID
  const badgeByTextMap = new Map<string, string>(); // text → postgres ID (fallback)

  for (const [, badge] of badgeEntries) {
    const result = await trx
      .insertInto("badges")
      .values({
        text: badge.text,
        group: badge.group ?? null,
        color: badge.color,
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();
    const key = `${badge.text}|${badge.group ?? ""}`;
    badgeMap.set(key, result.id);
    badgeByTextMap.set(badge.text.toLowerCase(), result.id);
  }

  // Phase 3: Classes
  console.log(`Inserting ${String(classEntries.length)} classes...`);
  const classMap = new Map<string, string>();

  // Find a fallback user for classes with no instructors
  const fallbackUserId = uidMap.values().next().value;
  if (!fallbackUserId) {
    throw new Error("No users found — cannot assign created_by for classes");
  }

  for (const [firebaseClassId, cls] of classEntries) {
    const instructors = getInstructorArray(cls.instructors);
    const firstInstructorUid = instructors[0];
    const createdBy = (firstInstructorUid ? uidMap.get(firstInstructorUid) : undefined) ?? fallbackUserId;

    const statusMap: Record<string, string> = { OPEN: "published", CLOSED: "cancelled" };
    const status = statusMap[cls.status] ?? "draft";

    const result = await trx
      .insertInto("classes")
      .values({
        title: cls.title,
        description: cls.description ?? null,
        date: cls.date,
        time: cls.time ?? null,
        status,
        grid_published: cls.gridPublished ?? false,
        created_by: createdBy,
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();
    classMap.set(firebaseClassId, result.id);
  }

  // Phase 4: Signups
  console.log(`Inserting ${String(signupEntries.length)} signups...`);
  let skippedSignups = 0;
  const validRsvps = new Set(["yes", "no", "maybe", "none"]);

  for (const signup of signupEntries) {
    const pgClassId = classMap.get(signup.classId);
    const pgUserId = uidMap.get(signup.userId);
    if (!pgClassId || !pgUserId) {
      skippedSignups++;
      continue;
    }
    const rsvp = validRsvps.has(signup.rsvp) ? signup.rsvp : "none";
    await trx
      .insertInto("signups")
      .values({
        class_id: pgClassId,
        user_id: pgUserId,
        rsvp,
      })
      .execute();
  }
  if (skippedSignups > 0) {
    console.log(`  ⚠️  Skipped ${String(skippedSignups)} signups (orphaned user/class references)`);
  }

  // Phase 5: Grid entries
  console.log(`Inserting ${String(gridEntries.length)} grid entries...`);
  let skippedGridEntries = 0;

  for (const entry of gridEntries) {
    const pgClassId = classMap.get(entry.classId);
    if (!pgClassId) {
      skippedGridEntries++;
      continue;
    }

    // Resolve badge text to badge_id
    let badgeId: string | null = null;
    if (entry.badge) {
      badgeId = badgeByTextMap.get(entry.badge.toLowerCase()) ?? null;
    }

    // Resolve instructor UIDs to postgres user IDs
    const instructorUids = getInstructorArray(entry.instructors);
    const instructorIds = instructorUids
      .map((uid) => uidMap.get(uid))
      .filter((id): id is string => id !== undefined);

    await trx
      .insertInto("grid_entries")
      .values({
        class_id: pgClassId,
        order: entry.order ?? 0,
        badge_id: badgeId,
        time: entry.time ?? null,
        description: entry.description ?? null,
        instructor_ids: JSON.stringify(instructorIds),
      })
      .execute();
  }
  if (skippedGridEntries > 0) {
    console.log(`  ⚠️  Skipped ${String(skippedGridEntries)} grid entries (orphaned class references)`);
  }
});

console.log(`\n✓ Migration complete!`);
console.log(`  Users:        ${String(userEntries.length)}`);
console.log(`  Badges:       ${String(badgeEntries.length)}`);
console.log(`  Classes:      ${String(classEntries.length)}`);
console.log(`  Signups:      ${String(signupEntries.length)}`);
console.log(`  Grid entries: ${String(gridEntries.length)}`);

await db.destroy();
