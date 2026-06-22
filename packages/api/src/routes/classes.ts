import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  registerRoutes,
  rsvpStatusSchema,
  canAssumeRole,
  type RsvpStatus,
  type ClassAttendanceResponse,
  type ClassAttendancePerson,
  type RouteHandlers,
} from "@skate5/shared";
import { db } from "../db/index.js";
import {
  toUser,
  toSkateClass,
  toSignup,
  toClassAttendancePerson,
  toBadge,
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
    return { ok: true };
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
