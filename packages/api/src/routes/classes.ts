import { FastifyInstance } from "fastify";
import { registerRoutes, RouteHandlers } from "@skate5/shared";
import { db } from "../db/index.js";
import { toUser, toSkateClass, toSignup, toBadge } from "../db/mappers.js";
import { authenticate } from "../middleware/auth.js";

const handlers: RouteHandlers = {
  getMe: async ({ user }) => {
    const row = await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", user.uid)
      .executeTakeFirstOrThrow();
    return toUser(row);
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
    const row = await db
      .insertInto("classes")
      .values({
        title: body.title,
        description: body.description ?? null,
        date: body.date,
        time: body.time ?? null,
        status: "draft",
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
