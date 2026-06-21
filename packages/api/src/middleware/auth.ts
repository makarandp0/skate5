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

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply | undefined> => {
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
      const displayName =
        typeof decoded.name === "string"
          ? decoded.name
          : decoded.email ?? "User";
      const photoUrl =
        typeof decoded.picture === "string" ? decoded.picture : null;

      row = await db
        .insertInto("users")
        .values({
          firebase_uid: decoded.uid,
          email: decoded.email ?? "",
          display_name: displayName,
          photo_url: photoUrl,
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
};
