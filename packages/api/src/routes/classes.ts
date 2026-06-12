import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { classes, signups } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";

export async function classRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get("/classes", async () => {
    return db.select().from(classes).orderBy(classes.date);
  });

  app.get("/classes/:id", async (request) => {
    const { id } = request.params as { id: string };
    const result = await db.select().from(classes).where(eq(classes.id, id));
    return result[0] ?? null;
  });

  app.post("/classes", async (request, reply) => {
    const body = request.body as {
      title: string;
      description?: string;
      date: string;
      time?: string;
    };
    const [created] = await db
      .insert(classes)
      .values({
        title: body.title,
        description: body.description ?? null,
        date: body.date,
        time: body.time ?? null,
        createdBy: request.user!.uid,
      })
      .returning();
    return reply.status(201).send(created);
  });

  app.get("/classes/:id/signups", async (request) => {
    const { id } = request.params as { id: string };
    return db.select().from(signups).where(eq(signups.classId, id));
  });

  app.post("/classes/:id/rsvp", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rsvp } = request.body as { rsvp: string };
    const userId = request.user!.uid;

    const existing = await db
      .select()
      .from(signups)
      .where(eq(signups.classId, id));
    const userSignup = existing.find((s) => s.userId === userId);

    if (userSignup) {
      await db
        .update(signups)
        .set({ rsvp, updatedAt: new Date() })
        .where(eq(signups.id, userSignup.id));
    } else {
      await db.insert(signups).values({ classId: id, userId, rsvp });
    }
    return reply.status(200).send({ ok: true });
  });
}
