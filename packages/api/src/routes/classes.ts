import { FastifyInstance } from "fastify";
import { sql } from "kysely";
import { z } from "zod";
import {
  registerRoutes,
  rsvpStatusSchema,
  canAssumeRole,
  userRoleSchema,
  type RsvpStatus,
  type ClassAttendanceResponse,
  type ClassAttendancePerson,
  type ClassGridResponse,
  type Chat,
  type ChatMessage,
  type RouteHandlers,
} from "@skate5/shared";
import { db } from "../db/index.js";
import {
  toUser,
  toSkateClass,
  toSignup,
  toClassAttendancePerson,
  toBadge,
  toGridEntry,
  toGridInstructor,
  toChat,
  toChatMessage,
} from "../db/mappers.js";
import { authenticate } from "../middleware/auth.js";

const countSchema = z.coerce.number().int().nonnegative();

const jsonbStringArray = (values: string[]) => {
  return sql<string[]>`${JSON.stringify(values)}::jsonb`;
};

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const getUserCount = async (): Promise<number> => {
  const row = await db
    .selectFrom("users")
    .select((eb) => eb.fn.countAll().as("count"))
    .executeTakeFirstOrThrow();

  return countSchema.parse(row.count);
};

const getAttendanceCounts = async (
  classId: string
): Promise<ClassAttendanceResponse["counts"]> => {
  const signupRows = await db
    .selectFrom("signups")
    .select(["user_id", "rsvp", "updated_at"])
    .where("class_id", "=", classId)
    .orderBy("updated_at", "desc")
    .execute();
  const totalUsers = await getUserCount();
  const rsvpsByUser = new Map<string, RsvpStatus>();

  for (const row of signupRows) {
    if (!rsvpsByUser.has(row.user_id)) {
      rsvpsByUser.set(row.user_id, rsvpStatusSchema.parse(row.rsvp));
    }
  }

  const counts: ClassAttendanceResponse["counts"] = {
    yes: 0,
    maybe: 0,
    no: 0,
    none: Math.max(totalUsers - rsvpsByUser.size, 0),
  };

  for (const rsvp of rsvpsByUser.values()) {
    counts[rsvp] += 1;
  }

  return counts;
};

const getPeopleWithRsvp = async (
  classId: string,
  rsvp: Exclude<RsvpStatus, "none">
): Promise<ClassAttendancePerson[]> => {
  const rows = await db
    .selectFrom("signups")
    .innerJoin("users", "users.id", "signups.user_id")
    .select([
      "users.id as user_id",
      "users.display_name as display_name",
      "users.photo_url as photo_url",
      "signups.rsvp as rsvp",
      "signups.id as signup_id",
    ])
    .where("signups.class_id", "=", classId)
    .where("signups.rsvp", "=", rsvp)
    .orderBy("users.display_name", "asc")
    .execute();

  return rows.map(toClassAttendancePerson);
};

const getPeopleWithoutResponse = async (
  classId: string
): Promise<ClassAttendancePerson[]> => {
  const rows = await db
    .selectFrom("users")
    .leftJoin("signups", (join) =>
      join
        .onRef("signups.user_id", "=", "users.id")
        .on("signups.class_id", "=", classId)
    )
    .select([
      "users.id as user_id",
      "users.display_name as display_name",
      "users.photo_url as photo_url",
      "signups.rsvp as rsvp",
      "signups.id as signup_id",
    ])
    .where((eb) =>
      eb.or([
        eb("signups.id", "is", null),
        eb("signups.rsvp", "=", "none"),
      ])
    )
    .orderBy("users.display_name", "asc")
    .execute();

  return rows.map(toClassAttendancePerson);
};

const getFilteredAttendancePeople = async (
  classId: string,
  rsvp: RsvpStatus
): Promise<ClassAttendancePerson[]> => {
  switch (rsvp) {
    case "yes":
    case "maybe":
    case "no":
      return getPeopleWithRsvp(classId, rsvp);
    case "none":
      return getPeopleWithoutResponse(classId);
    default:
      return rsvp satisfies never;
  }
};

const getCurrentUserRsvp = async (
  classId: string,
  userId: string
): Promise<RsvpStatus> => {
  const row = await db
    .selectFrom("signups")
    .select(["rsvp"])
    .where("class_id", "=", classId)
    .where("user_id", "=", userId)
    .orderBy("updated_at", "desc")
    .executeTakeFirst();

  return row ? rsvpStatusSchema.parse(row.rsvp) : "none";
};

const ensureClassExists = async (classId: string): Promise<void> => {
  const row = await db
    .selectFrom("classes")
    .select(["id"])
    .where("id", "=", classId)
    .executeTakeFirst();

  if (!row) {
    throw new HttpError(404, "Class not found");
  }
};

const getUserDisplayName = async (userId: string): Promise<string> => {
  const row = await db
    .selectFrom("users")
    .select(["display_name"])
    .where("id", "=", userId)
    .executeTakeFirst();

  return row?.display_name ?? "Someone";
};

const getRequiredUserDisplayName = async (userId: string): Promise<string> => {
  const row = await db
    .selectFrom("users")
    .select(["display_name"])
    .where("id", "=", userId)
    .executeTakeFirst();

  if (!row) {
    throw new HttpError(404, "User not found");
  }

  return row.display_name;
};

const setClassRsvp = async ({
  classId,
  userId,
  rsvp,
}: {
  classId: string;
  userId: string;
  rsvp: RsvpStatus;
}): Promise<RsvpStatus> => {
  await ensureClassExists(classId);

  const existing = await db
    .selectFrom("signups")
    .selectAll()
    .where("class_id", "=", classId)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable("signups")
      .set({ rsvp, updated_at: new Date() })
      .where("id", "=", existing.id)
      .execute();
  } else {
    await db
      .insertInto("signups")
      .values({ class_id: classId, user_id: userId, rsvp })
      .execute();
  }

  return existing ? rsvpStatusSchema.parse(existing.rsvp) : "none";
};

const getOrCreateClassChat = async (classId: string): Promise<Chat> => {
  const existing = await db
    .selectFrom("chats")
    .selectAll()
    .where("topic_id", "=", classId)
    .executeTakeFirst();

  if (existing) {
    return toChat(existing);
  }

  const skateClass = await db
    .selectFrom("classes")
    .select(["title"])
    .where("id", "=", classId)
    .executeTakeFirst();

  if (!skateClass) {
    throw new HttpError(404, "Class not found");
  }

  const created = await db
    .insertInto("chats")
    .values({
      title: skateClass.title,
      topic_id: classId,
    })
    .onConflict((oc) =>
      oc.column("topic_id").where("topic_id", "is not", null).doNothing()
    )
    .returningAll()
    .executeTakeFirst();

  if (created) {
    return toChat(created);
  }

  const winner = await db
    .selectFrom("chats")
    .selectAll()
    .where("topic_id", "=", classId)
    .executeTakeFirstOrThrow();

  return toChat(winner);
};

const getChatMessages = async (chatId: string): Promise<ChatMessage[]> => {
  const rows = await db
    .selectFrom("chat_messages")
    .innerJoin("users", "users.id", "chat_messages.user_id")
    .select([
      "chat_messages.id as id",
      "chat_messages.chat_id as chat_id",
      "chat_messages.user_id as user_id",
      "users.display_name as user_display_name",
      "users.photo_url as user_photo_url",
      "chat_messages.kind as kind",
      "chat_messages.text as text",
      "chat_messages.created_at as created_at",
    ])
    .where("chat_messages.chat_id", "=", chatId)
    .orderBy("chat_messages.created_at", "asc")
    .execute();

  return rows.map(toChatMessage);
};

const createChatMessage = async ({
  chatId,
  userId,
  text,
  kind,
}: {
  chatId: string;
  userId: string;
  text: string;
  kind: ChatMessage["kind"];
}): Promise<ChatMessage> => {
  const message = await db
    .insertInto("chat_messages")
    .values({
      chat_id: chatId,
      user_id: userId,
      kind,
      text,
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  const rows = await db
    .selectFrom("chat_messages")
    .innerJoin("users", "users.id", "chat_messages.user_id")
    .select([
      "chat_messages.id as id",
      "chat_messages.chat_id as chat_id",
      "chat_messages.user_id as user_id",
      "users.display_name as user_display_name",
      "users.photo_url as user_photo_url",
      "chat_messages.kind as kind",
      "chat_messages.text as text",
      "chat_messages.created_at as created_at",
    ])
    .where("chat_messages.id", "=", message.id)
    .executeTakeFirstOrThrow();

  return toChatMessage(rows);
};

const createSystemClassMessage = async ({
  classId,
  userId,
  text,
}: {
  classId: string;
  userId: string;
  text: string;
}): Promise<void> => {
  const chat = await getOrCreateClassChat(classId);
  await createChatMessage({
    chatId: chat.id,
    userId,
    kind: "system",
    text,
  });
};

const requireAdmin = (role: Parameters<typeof canAssumeRole>[0]): void => {
  if (!canAssumeRole(role, "admin")) {
    throw new HttpError(403, "Only admins can manage the class grid");
  }
};

const toDateKey = (value: string): string | null => {
  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateOnly) return dateOnly;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = String(parsed.getFullYear());
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const shiftDateKey = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getGridEntriesForClass = async (
  classId: string
): Promise<ClassGridResponse["entries"]> => {
  const rows = await db
    .selectFrom("grid_entries")
    .selectAll()
    .where("class_id", "=", classId)
    .orderBy("order", "asc")
    .orderBy("id", "asc")
    .execute();

  return rows.map(toGridEntry);
};

const getBadges = async (): Promise<ClassGridResponse["badges"]> => {
  const rows = await db
    .selectFrom("badges")
    .selectAll()
    .orderBy("group", "asc")
    .orderBy("text", "asc")
    .execute();
  return rows.map(toBadge);
};

const getGridInstructors = async ({
  classId,
  entries,
  canManage,
}: {
  classId: string;
  entries: ClassGridResponse["entries"];
  canManage: boolean;
}): Promise<ClassGridResponse["instructors"]> => {
  const assignedUserIds = new Set<string>();

  for (const entry of entries) {
    for (const instructorId of entry.instructorIds) {
      assignedUserIds.add(instructorId);
    }
  }

  const signupRows = await db
    .selectFrom("signups")
    .select(["user_id", "rsvp", "updated_at"])
    .where("class_id", "=", classId)
    .orderBy("updated_at", "desc")
    .execute();
  const latestRsvpByUser = new Map<string, RsvpStatus>();

  for (const row of signupRows) {
    if (!latestRsvpByUser.has(row.user_id)) {
      latestRsvpByUser.set(row.user_id, rsvpStatusSchema.parse(row.rsvp));
    }
  }

  const userRows = await db
    .selectFrom("users")
    .select([
      "users.id as user_id",
      "users.display_name as display_name",
      "users.photo_url as photo_url",
      "users.role as role",
    ])
    .orderBy("users.display_name", "asc")
    .execute();

  return userRows
    .filter((row) => {
      const role = userRoleSchema.parse(row.role);
      const rsvp = latestRsvpByUser.get(row.user_id) ?? "none";
      return (
        assignedUserIds.has(row.user_id) ||
        (canManage && canAssumeRole(role, "instructor") && rsvp === "yes")
      );
    })
    .map((row) =>
      toGridInstructor({
        ...row,
        rsvp: latestRsvpByUser.get(row.user_id) ?? "none",
      })
    );
};

const getClassGridResponse = async ({
  classId,
  canManage,
}: {
  classId: string;
  canManage: boolean;
}): Promise<ClassGridResponse> => {
  const classRow = await db
    .selectFrom("classes")
    .selectAll()
    .where("id", "=", classId)
    .executeTakeFirst();

  if (!classRow) {
    throw new HttpError(404, "Class not found");
  }

  const skateClass = toSkateClass(classRow);
  if (!canManage && !skateClass.gridPublished) {
    return {
      class: skateClass,
      entries: [],
      badges: [],
      instructors: [],
    };
  }

  const entries = await getGridEntriesForClass(classId);
  const [badges, instructors] = await Promise.all([
    getBadges(),
    getGridInstructors({ classId, entries, canManage }),
  ]);

  return {
    class: skateClass,
    entries,
    badges,
    instructors,
  };
};

const requireClassGridEntry = async ({
  classId,
  entryId,
}: {
  classId: string;
  entryId: string;
}): Promise<void> => {
  const row = await db
    .selectFrom("grid_entries")
    .select(["id"])
    .where("id", "=", entryId)
    .where("class_id", "=", classId)
    .executeTakeFirst();

  if (!row) {
    throw new HttpError(404, "Grid entry not found");
  }
};

const updateGridOrder = async ({
  classId,
  entryIds,
}: {
  classId: string;
  entryIds: string[];
}): Promise<void> => {
  const existingRows = await db
    .selectFrom("grid_entries")
    .select(["id"])
    .where("class_id", "=", classId)
    .execute();
  const existingIds = existingRows.map((row) => row.id);

  if (entryIds.length !== existingIds.length) {
    throw new HttpError(400, "Grid order must include every entry exactly once");
  }

  const seen = new Set<string>();
  for (const entryId of entryIds) {
    if (seen.has(entryId) || !existingIds.includes(entryId)) {
      throw new HttpError(
        400,
        "Grid order must include every entry exactly once"
      );
    }
    seen.add(entryId);
  }

  await db.transaction().execute(async (trx) => {
    for (const [order, entryId] of entryIds.entries()) {
      await trx
        .updateTable("grid_entries")
        .set({ order })
        .where("id", "=", entryId)
        .where("class_id", "=", classId)
        .execute();
    }
  });
};

const duplicatePreviousGrid = async (classId: string): Promise<void> => {
  const currentClass = await db
    .selectFrom("classes")
    .select(["date"])
    .where("id", "=", classId)
    .executeTakeFirst();

  if (!currentClass) {
    throw new HttpError(404, "Class not found");
  }

  const currentEntries = await getGridEntriesForClass(classId);
  if (currentEntries.length > 0) {
    throw new HttpError(409, "Current class already has grid entries");
  }

  const currentDateKey = toDateKey(currentClass.date);
  if (!currentDateKey) {
    throw new HttpError(400, "Class date is invalid");
  }

  const previousDateKey = shiftDateKey(currentDateKey, -7);
  const classRows = await db
    .selectFrom("classes")
    .select(["id", "date"])
    .execute();
  const previousClass = classRows.find(
    (row) => row.id !== classId && toDateKey(row.date) === previousDateKey
  );

  if (!previousClass) {
    return;
  }

  const previousEntries = await getGridEntriesForClass(previousClass.id);
  if (previousEntries.length === 0) {
    return;
  }

  await db.transaction().execute(async (trx) => {
    for (const entry of previousEntries) {
      await trx
        .insertInto("grid_entries")
        .values({
          class_id: classId,
          order: entry.order,
          badge_id: entry.badgeId,
          time: entry.time,
          description: entry.description,
          instructor_ids: jsonbStringArray([]),
        })
        .execute();
    }
  });
};

const handlers: RouteHandlers = {
  getMe: async ({ user }) => {
    const row = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", user.uid)
      .executeTakeFirstOrThrow();
    return toUser(row, user.role);
  },

  getClasses: async () => {
    const rows = await db.selectFrom("classes").selectAll().orderBy("date", "asc").execute();
    return rows.map(toSkateClass);
  },

  getClass: async ({ params }) => {
    const row = await db
      .selectFrom("classes")
      .selectAll()
      .where("id", "=", params.id)
      .executeTakeFirst();
    return row ? toSkateClass(row) : null;
  },

  createClass: async ({ body, user }) => {
    if (!canAssumeRole(user.role, "admin")) {
      throw new HttpError(403, "Only admins can create classes");
    }

    const row = await db
      .insertInto("classes")
      .values({
        title: body.title,
        description: body.description ?? null,
        date: body.date,
        time: body.time ?? null,
        status: body.status,
        created_by: user.uid,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const userDisplayName = await getUserDisplayName(user.uid);
    await createSystemClassMessage({
      classId: row.id,
      userId: user.uid,
      text: `Class created by ${userDisplayName}.`,
    });

    return toSkateClass(row);
  },

  updateClass: async ({ params, body, user }) => {
    if (!canAssumeRole(user.role, "admin")) {
      throw new HttpError(403, "Only admins can update classes");
    }

    const row = await db
      .updateTable("classes")
      .set({
        title: body.title,
        description: body.description ?? null,
        time: body.time ?? null,
        status: body.status,
        updated_at: new Date(),
      })
      .where("id", "=", params.id)
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new HttpError(404, "Class not found");
    }

    const userDisplayName = await getUserDisplayName(user.uid);
    await createSystemClassMessage({
      classId: row.id,
      userId: user.uid,
      text: `Class updated by ${userDisplayName}.`,
    });

    return toSkateClass(row);
  },

  getClassSignups: async ({ params }) => {
    const rows = await db
      .selectFrom("signups")
      .selectAll()
      .where("class_id", "=", params.id)
      .execute();
    return rows.map(toSignup);
  },

  getClassAttendance: async ({ params, user }) => {
    const [counts, currentUserRsvp, people] = await Promise.all([
      getAttendanceCounts(params.id),
      getCurrentUserRsvp(params.id, user.uid),
      getFilteredAttendancePeople(params.id, params.rsvp),
    ]);

    return { counts, currentUserRsvp, people };
  },

  rsvp: async ({ params, body, user }) => {
    const previousRsvp = await setClassRsvp({
      classId: params.id,
      userId: user.uid,
      rsvp: body.rsvp,
    });
    if (previousRsvp !== body.rsvp) {
      const userDisplayName = await getUserDisplayName(user.uid);
      await createSystemClassMessage({
        classId: params.id,
        userId: user.uid,
        text: `${userDisplayName} RSVPed ${body.rsvp}.`,
      });
    }
    return { ok: true };
  },

  setUserRsvp: async ({ params, body, user }) => {
    if (!canAssumeRole(user.role, "admin")) {
      throw new HttpError(403, "Only admins can RSVP for others");
    }

    const [actorDisplayName, targetDisplayName] = await Promise.all([
      getUserDisplayName(user.uid),
      getRequiredUserDisplayName(params.userId),
    ]);
    const previousRsvp = await setClassRsvp({
      classId: params.id,
      userId: params.userId,
      rsvp: body.rsvp,
    });

    if (previousRsvp !== body.rsvp) {
      await createSystemClassMessage({
        classId: params.id,
        userId: user.uid,
        text: `${actorDisplayName} set ${targetDisplayName}'s RSVP to ${body.rsvp}.`,
      });
    }

    return { ok: true };
  },

  getClassChat: async ({ params }) => {
    const chat = await getOrCreateClassChat(params.id);
    const messages = await getChatMessages(chat.id);
    return { chat, messages };
  },

  sendClassChatMessage: async ({ params, body, user }) => {
    const chat = await getOrCreateClassChat(params.id);
    return createChatMessage({
      chatId: chat.id,
      userId: user.uid,
      kind: "user",
      text: body.text.trim(),
    });
  },

  getBadges: async () => {
    const rows = await db.selectFrom("badges").selectAll().execute();
    return rows.map(toBadge);
  },

  createBadge: async ({ body }) => {
    const row = await db
      .insertInto("badges")
      .values({
        text: body.text,
        group: body.group ?? null,
        color: body.color,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toBadge(row);
  },

  getClassGrid: async ({ params, user }) => {
    return getClassGridResponse({
      classId: params.id,
      canManage: canAssumeRole(user.role, "admin"),
    });
  },

  createClassGridEntry: async ({ params, body, user }) => {
    requireAdmin(user.role);
    await ensureClassExists(params.id);

    await db
      .insertInto("grid_entries")
      .values({
        class_id: params.id,
        order: body.order,
        badge_id: body.badgeId ?? null,
        time: body.time ?? null,
        description: body.description ?? null,
        instructor_ids: jsonbStringArray(body.instructorIds),
      })
      .execute();

    return getClassGridResponse({ classId: params.id, canManage: true });
  },

  updateClassGridEntry: async ({ params, body, user }) => {
    requireAdmin(user.role);
    await requireClassGridEntry({
      classId: params.id,
      entryId: params.entryId,
    });

    await db
      .updateTable("grid_entries")
      .set({
        order: body.order,
        badge_id: body.badgeId ?? null,
        time: body.time ?? null,
        description: body.description ?? null,
        instructor_ids: jsonbStringArray(body.instructorIds),
      })
      .where("id", "=", params.entryId)
      .where("class_id", "=", params.id)
      .execute();

    return getClassGridResponse({ classId: params.id, canManage: true });
  },

  deleteClassGridEntry: async ({ params, user }) => {
    requireAdmin(user.role);
    await ensureClassExists(params.id);

    await db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom("grid_entries")
        .where("id", "=", params.entryId)
        .where("class_id", "=", params.id)
        .execute();

      const rows = await trx
        .selectFrom("grid_entries")
        .select(["id"])
        .where("class_id", "=", params.id)
        .orderBy("order", "asc")
        .orderBy("id", "asc")
        .execute();

      for (const [order, row] of rows.entries()) {
        await trx
          .updateTable("grid_entries")
          .set({ order })
          .where("id", "=", row.id)
          .where("class_id", "=", params.id)
          .execute();
      }
    });

    return getClassGridResponse({ classId: params.id, canManage: true });
  },

  reorderClassGridEntries: async ({ params, body, user }) => {
    requireAdmin(user.role);
    await updateGridOrder({ classId: params.id, entryIds: body.entryIds });

    return getClassGridResponse({ classId: params.id, canManage: true });
  },

  duplicatePreviousClassGrid: async ({ params, user }) => {
    requireAdmin(user.role);
    await duplicatePreviousGrid(params.id);

    return getClassGridResponse({ classId: params.id, canManage: true });
  },

  publishClassGrid: async ({ params, body, user }) => {
    requireAdmin(user.role);

    const row = await db
      .updateTable("classes")
      .set({
        grid_published: body.published,
        updated_at: new Date(),
      })
      .where("id", "=", params.id)
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new HttpError(404, "Class not found");
    }

    const userDisplayName = await getUserDisplayName(user.uid);
    await createSystemClassMessage({
      classId: params.id,
      userId: user.uid,
      text: body.published
        ? `Grid published by ${userDisplayName}.`
        : `Grid unpublished by ${userDisplayName}.`,
    });

    return getClassGridResponse({ classId: params.id, canManage: true });
  },
};

export const classRoutes = (app: FastifyInstance): void => {
  app.addHook("onRequest", authenticate);
  registerRoutes(app, handlers);
};
