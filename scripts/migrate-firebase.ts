/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-argument */
// One-time migration script — type assertions needed for dynamic JSON processing.

import { config } from "dotenv";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import { z } from "zod";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { Database } from "../packages/api/src/db/types.js";
import { classPillSchema } from "../packages/shared/src/schemas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultLocationSlug = "lynnwood-bowl-and-skate";

// Load .env from packages/api/.env unless DATABASE_URL is already set
if (!process.env.DATABASE_URL) {
  config({ path: path.resolve(__dirname, "../packages/api/.env") });
}

// --- Zod schemas for Firebase export ---

const firebaseTimestampSchema = z.union([z.string(), z.number()]).nullable().optional();

const firebaseUserSchema = z.object({
  displayName: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  createdAt: firebaseTimestampSchema,
  created_at: firebaseTimestampSchema,
  creationTime: firebaseTimestampSchema,
  createdAtTimestamp: firebaseTimestampSchema,
  lastLoginAt: firebaseTimestampSchema,
  lastSignInTime: firebaseTimestampSchema,
  lastSignInTimestamp: firebaseTimestampSchema,
  last_login_at: firebaseTimestampSchema,
  metadata: z
    .object({
      creationTime: firebaseTimestampSchema,
      lastSignInTime: firebaseTimestampSchema,
    })
    .optional(),
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

const firebaseChatMessageSchema = z.object({
  id: z.string().optional(),
  date: firebaseTimestampSchema,
  from: z.string().optional(),
  message: z.string().optional(),
  messageType: z.enum(["notification", "chat"]).optional(),
});

const firebaseChatMetaSchema = z.object({
  chatTitle: z.string().optional(),
  topicId: z.string().optional(),
  date: firebaseTimestampSchema,
});

const firebaseChatsSchema = z.object({
  messagesByChatId: z
    .record(z.string(), z.record(z.string(), firebaseChatMessageSchema))
    .optional()
    .default({}),
  metaByChatId: z
    .record(z.string(), firebaseChatMetaSchema)
    .optional()
    .default({}),
});

const firebaseExportSchema = z.object({
  users: z.record(z.string(), firebaseUserSchema).optional().default({}),
  classes: z.record(z.string(), firebaseClassSchema).optional().default({}),
  signups: z.record(z.string(), z.record(z.string(), firebaseSignupSchema)).optional().default({}),
  badges: z.record(z.string(), firebaseBadgeSchema).optional().default({}),
  grids: z.record(z.string(), z.record(z.string(), firebaseGridEntrySchema)).optional().default({}),
  chats: firebaseChatsSchema.optional().default({
    messagesByChatId: {},
    metaByChatId: {},
  }),
});

const firebaseAuthExportUserSchema = z.object({
  localId: z.string(),
  email: z.string().nullable().optional(),
  createdAt: firebaseTimestampSchema,
  lastSignedInAt: firebaseTimestampSchema,
});

const firebaseAuthExportSchema = z.union([
  z.object({
    users: z.array(firebaseAuthExportUserSchema).optional().default([]),
  }),
  z.array(firebaseAuthExportUserSchema),
]);

type FirebaseTimestamp = z.infer<typeof firebaseTimestampSchema>;
type FirebaseUser = z.infer<typeof firebaseUserSchema>;
type FirebaseClass = z.infer<typeof firebaseClassSchema>;
type FirebaseChatMessage = z.infer<typeof firebaseChatMessageSchema>;
type FirebaseAuthExportUser = z.infer<typeof firebaseAuthExportUserSchema>;

type LegacySystemMessageEntry = {
  firebaseClassId: string;
  chatId: string;
  messageId: string;
  message: FirebaseChatMessage;
};

type AuthUserMetadata = {
  uid: string;
  email: string | null;
  createdAt: Date | null;
  lastLoginAt: Date | null;
};

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

const generatedDayDateTitlePattern =
  /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) - (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}$/i;

function shouldImportLegacyClassPill(value: string): boolean {
  const lowerValue = value.toLowerCase();
  return (
    lowerValue !== "description goes here" &&
    !generatedDayDateTitlePattern.test(value)
  );
}

function getLegacyClassPills(cls: FirebaseClass): string[] {
  const pills: string[] = [];

  for (const value of [cls.title, cls.description ?? ""]) {
    const parsed = classPillSchema.safeParse(value);
    if (!parsed.success || !shouldImportLegacyClassPill(parsed.data)) {
      continue;
    }

    if (!pills.some((pill) => pill.toLowerCase() === parsed.data.toLowerCase())) {
      pills.push(parsed.data);
    }
  }

  return pills.slice(0, 8);
}

function jsonbStringArray(values: string[]) {
  return sql<string[]>`${JSON.stringify(values)}::jsonb`;
}

function getAuthExportCreatedAt(user: FirebaseAuthExportUser): Date | null {
  return parseFirebaseTimestamp(user.createdAt);
}

function getAuthExportLastLoginAt(user: FirebaseAuthExportUser): Date | null {
  return parseFirebaseTimestamp(user.lastSignedInAt);
}

function parseAuthUsersJson(rawJson: string): Map<string, AuthUserMetadata> {
  const parsed: unknown = JSON.parse(rawJson);
  const data = firebaseAuthExportSchema.parse(parsed);
  const users = Array.isArray(data) ? data : data.users;
  const usersByUid = new Map<string, AuthUserMetadata>();

  for (const user of users) {
    usersByUid.set(user.localId, {
      uid: user.localId,
      email: user.email ?? null,
      createdAt: getAuthExportCreatedAt(user),
      lastLoginAt: getAuthExportLastLoginAt(user),
    });
  }

  return usersByUid;
}

function parseFirebaseTimestamp(value: FirebaseTimestamp): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    const millis = Math.abs(value) < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return parseFirebaseTimestamp(Number(trimmed));
  }

  const millis = Date.parse(trimmed);
  if (Number.isNaN(millis)) return null;
  return new Date(millis);
}

function getUserLastLoginAt(user: FirebaseUser): Date | null {
  const candidates: FirebaseTimestamp[] = [
    user.lastLoginAt,
    user.last_login_at,
    user.lastSignInTime,
    user.lastSignInTimestamp,
    user.metadata?.lastSignInTime,
  ];

  for (const candidate of candidates) {
    const parsed = parseFirebaseTimestamp(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function getUserCreatedAt(user: FirebaseUser): Date | null {
  const candidates: FirebaseTimestamp[] = [
    user.createdAt,
    user.created_at,
    user.creationTime,
    user.createdAtTimestamp,
    user.metadata?.creationTime,
  ];

  for (const candidate of candidates) {
    const parsed = parseFirebaseTimestamp(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function isLegacySystemMessage(message: FirebaseChatMessage): boolean {
  return (
    message.messageType === "notification" ||
    (message.messageType === undefined &&
      message.message !== undefined &&
      message.message.includes("RSVPed"))
  );
}

function getLegacySystemMessageEntries(
  data: z.infer<typeof firebaseExportSchema>
): LegacySystemMessageEntry[] {
  const classIds = new Set(Object.keys(data.classes));
  const entries: LegacySystemMessageEntry[] = [];

  for (const [chatId, meta] of Object.entries(data.chats.metaByChatId)) {
    if (!meta.topicId || !classIds.has(meta.topicId)) {
      continue;
    }

    const messages = data.chats.messagesByChatId[chatId] ?? {};
    for (const [messageId, message] of Object.entries(messages)) {
      if (isLegacySystemMessage(message)) {
        entries.push({
          firebaseClassId: meta.topicId,
          chatId,
          messageId,
          message,
        });
      }
    }
  }

  return entries.sort((left, right) => {
    const leftDate = parseFirebaseTimestamp(left.message.date)?.getTime() ?? 0;
    const rightDate = parseFirebaseTimestamp(right.message.date)?.getTime() ?? 0;
    if (leftDate !== rightDate) return leftDate - rightDate;
    return left.messageId.localeCompare(right.messageId);
  });
}

// --- Main ---

const args = process.argv.slice(2);
const jsonPath = args.find((a) => !a.startsWith("--"));
const authUsersJsonFlagIndex = args.findIndex(
  (a) => a === "--auth-users-json"
);
const authUsersJsonEqualsArg = args.find((a) =>
  a.startsWith("--auth-users-json=")
);
const authUsersJsonPath =
  authUsersJsonEqualsArg?.slice("--auth-users-json=".length) ??
  (authUsersJsonFlagIndex >= 0
    ? args[authUsersJsonFlagIndex + 1]
    : undefined);
const forceFlag = args.includes("--force");

if (!jsonPath) {
  // Firebase Auth sidecar JSON:
  // firebase auth:export /tmp/skate1-auth-users.json --format=json --project skate1-test
  console.error(
    "Usage: tsx scripts/migrate-firebase.ts <path-to-rtdb-export.json> [--auth-users-json <path-to-auth-users.json>] [--force]"
  );
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
const authUsersByUid = authUsersJsonPath
  ? parseAuthUsersJson(await readFile(path.resolve(authUsersJsonPath), "utf-8"))
  : new Map<string, AuthUserMetadata>();

// Count entities
const userEntries = Object.entries(data.users);
const badgeEntries = Object.entries(data.badges);
const classEntries = Object.entries(data.classes);
const signupEntries = Object.entries(data.signups).flatMap(([classId, users]) =>
  Object.entries(users).map(([userId, signup]) => ({
    ...signup,
    classId,
    userId,
  }))
);
const gridEntries = Object.entries(data.grids)
  .filter(([classId]) => classId !== "undefined")
  .flatMap(([classId, entries]) =>
    Object.entries(entries)
      .filter(([, entry]) => entry.classId !== undefined)
      .map(([entryId, entry]) => ({ classId, entryId, ...entry }))
  );
const systemMessageEntries = getLegacySystemMessageEntries(data);

// Show confirmation
console.log(`\nTarget: ${maskConnectionString(connectionString)}`);
console.log(`Data to import:`);
console.log(`  Users:        ${String(userEntries.length)}`);
console.log(`  Badges:       ${String(badgeEntries.length)}`);
console.log(`  Classes:      ${String(classEntries.length)}`);
console.log(`  Signups:      ${String(signupEntries.length)}`);
console.log(`  Grid entries: ${String(gridEntries.length)}`);
console.log(`  System msgs:  ${String(systemMessageEntries.length)}`);
if (authUsersJsonPath) {
  console.log(`  Auth users:   ${String(authUsersByUid.size)} from ${authUsersJsonPath}`);
}
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

  const defaultLocation = await trx
    .insertInto("locations")
    .values({
      slug: defaultLocationSlug,
      name: "Lynnwood Bowl and Skate",
      short_name: "Lynnwood",
      address: "6210 200th St SW, Lynnwood, WA 98036",
      color: "#2563eb",
      sort_order: 0,
    })
    .onConflict((oc) =>
      oc.column("slug").doUpdateSet({
        name: "Lynnwood Bowl and Skate",
        short_name: "Lynnwood",
        address: "6210 200th St SW, Lynnwood, WA 98036",
        color: "#2563eb",
        active: true,
        sort_order: 0,
      })
    )
    .returning(["slug"])
    .executeTakeFirstOrThrow();

  await trx
    .insertInto("locations")
    .values({
      slug: "rock-and-roll-rink-issaquah",
      name: "Rock and Roll Rink - Issaquah",
      short_name: "Issaquah",
      address: "5700 E Lake Sammamish Pkwy SE, Issaquah, WA 98029",
      color: "#16a34a",
      sort_order: 1,
    })
    .onConflict((oc) =>
      oc.column("slug").doUpdateSet({
        name: "Rock and Roll Rink - Issaquah",
        short_name: "Issaquah",
        address: "5700 E Lake Sammamish Pkwy SE, Issaquah, WA 98029",
        color: "#16a34a",
        active: true,
        sort_order: 1,
      })
    )
    .execute();

  // Phase 1: Users
  console.log(`Inserting ${String(userEntries.length)} users...`);
  const uidMap = new Map<string, string>();

  for (const [firebaseUid, user] of userEntries) {
    const authUser = authUsersByUid.get(firebaseUid);
    const createdAt = authUser?.createdAt ?? getUserCreatedAt(user);
    const lastLoginAt = authUser?.lastLoginAt ?? getUserLastLoginAt(user);
    const result = await trx
      .insertInto("users")
      .values({
        firebase_uid: firebaseUid,
        email: user.email ?? `${firebaseUid}@unknown.com`,
        display_name: user.displayName ?? "Unknown",
        photo_url: user.photoURL ?? null,
        role: user.role ?? "member",
        last_login_at: lastLoginAt,
        ...(createdAt
          ? {
              created_at: createdAt,
              updated_at: createdAt,
            }
          : {}),
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();
    uidMap.set(firebaseUid, result.id);
  }

  // Phase 2: Badges
  console.log(`Inserting ${String(badgeEntries.length)} badges...`);

  for (const [, badge] of badgeEntries) {
    await trx
      .insertInto("badges")
      .values({
        text: badge.text,
        group: badge.group ?? null,
        color: badge.color,
      })
      .execute();
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
        title: "",
        description: null,
        pills: jsonbStringArray(getLegacyClassPills(cls)),
        date: cls.date,
        time: cls.time ?? null,
        location_slug: defaultLocation.slug,
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

    const classText = entry.badge ?? entry.description ?? null;
    const notes = entry.badge ? entry.description ?? null : null;

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
        time: entry.time ?? null,
        class_text: classText,
        notes,
        instructor_ids: sql<string[]>`${JSON.stringify(instructorIds)}::jsonb`,
      })
      .execute();
  }
  if (skippedGridEntries > 0) {
    console.log(`  ⚠️  Skipped ${String(skippedGridEntries)} grid entries (orphaned class references)`);
  }

  // Phase 6: Class system messages
  console.log(`Inserting ${String(systemMessageEntries.length)} system messages...`);
  let skippedSystemMessages = 0;
  let fallbackSystemMessageSenders = 0;
  const chatMap = new Map<string, string>();

  for (const entry of systemMessageEntries) {
    const pgClassId = classMap.get(entry.firebaseClassId);
    const text = entry.message.message?.trim();
    if (!pgClassId || !text) {
      skippedSystemMessages++;
      continue;
    }

    let pgChatId = chatMap.get(entry.firebaseClassId);
    if (!pgChatId) {
      const legacyMeta = data.chats.metaByChatId[entry.chatId];
      const createdAt =
        parseFirebaseTimestamp(legacyMeta?.date) ??
        parseFirebaseTimestamp(entry.message.date) ??
        new Date();
      const chat = await trx
        .insertInto("chats")
        .values({
          title: legacyMeta?.chatTitle ?? "Class chat",
          topic_id: pgClassId,
          created_at: createdAt,
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();
      pgChatId = chat.id;
      chatMap.set(entry.firebaseClassId, pgChatId);
    }

    const senderUserId =
      entry.message.from !== undefined
        ? uidMap.get(entry.message.from)
        : undefined;
    const userId = senderUserId ?? fallbackUserId;
    if (!senderUserId) {
      fallbackSystemMessageSenders++;
    }

    await trx
      .insertInto("chat_messages")
      .values({
        chat_id: pgChatId,
        user_id: userId,
        kind: "system",
        text,
        created_at: parseFirebaseTimestamp(entry.message.date) ?? new Date(),
      })
      .execute();
  }
  if (skippedSystemMessages > 0) {
    console.log(
      `  ⚠️  Skipped ${String(skippedSystemMessages)} system messages (orphaned class or empty text)`
    );
  }
  if (fallbackSystemMessageSenders > 0) {
    console.log(
      `  ⚠️  Used fallback sender for ${String(fallbackSystemMessageSenders)} system messages`
    );
  }
});

console.log(`\n✓ Migration complete!`);
console.log(`  Users:        ${String(userEntries.length)}`);
console.log(`  Badges:       ${String(badgeEntries.length)}`);
console.log(`  Classes:      ${String(classEntries.length)}`);
console.log(`  Signups:      ${String(signupEntries.length)}`);
console.log(`  Grid entries: ${String(gridEntries.length)}`);
console.log(`  System msgs:  ${String(systemMessageEntries.length)}`);

await db.destroy();
