import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "firebase-admin/auth";
import { db } from "../db/index.js";

export interface AuthUser {
  uid: string;
  firebaseUid: string;
  email: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing authorization header" });
  }

  const token = header.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token);

    let row = await db
      .selectFrom("users")
      .select(["id", "email"])
      .where("firebase_uid", "=", decoded.uid)
      .executeTakeFirst();

    if (!row) {
      row = await db
        .insertInto("users")
        .values({
          firebase_uid: decoded.uid,
          email: decoded.email ?? "",
          display_name: decoded.name ?? decoded.email ?? "User",
          photo_url: decoded.picture ?? null,
          role: "member",
        })
        .returning(["id", "email"])
        .executeTakeFirstOrThrow();
    }

    request.user = {
      uid: row.id,
      firebaseUid: decoded.uid,
      email: row.email,
    };
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}
