import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  registerRoutes,
  rsvpStatusSchema,
  canAssumeRole,
  type RsvpStatus,
  type ClassAttendanceResponse,
  type ClassAttendancePerson,
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
  toChat,
  toChatMessage,
} from "../db/mappers.js";
import { authenticate } from "../middleware/auth.js";

const countSchema = z.coerce.number().int().nonnegative();

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

const getUserDisplayName = async (userId: string): Promise<string> => {
  const row = await db
    .selectFrom("users")
    .select(["display_name"])
    .where("id", "=", userId)
    .executeTakeFirst();

  return row?.display_name ?? "Someone";
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
    const existing = await db
      .selectFrom("signups")
      .selectAll()
      .where("class_id", "=", params.id)
      .where("user_id", "=", user.uid)
      .executeTakeFirst();

    if (existing) {
      await db
        .updateTable("signups")
        .set({ rsvp: body.rsvp, updated_at: new Date() })
        .where("id", "=", existing.id)
        .execute();
    } else {
      await db
        .insertInto("signups")
        .values({ class_id: params.id, user_id: user.uid, rsvp: body.rsvp })
        .execute();
    }

    const previousRsvp = existing
      ? rsvpStatusSchema.parse(existing.rsvp)
      : "none";
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
};

export const classRoutes = (app: FastifyInstance): void => {
  app.addHook("onRequest", authenticate);
  registerRoutes(app, handlers);
};
