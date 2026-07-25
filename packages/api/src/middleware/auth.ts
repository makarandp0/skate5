import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "firebase-admin/auth";
import {
  canAssumeRole,
  userRoleSchema,
  type UserRole,
} from "@skate5/shared";
import { db } from "../db/index.js";
import {
  recordUserCreated,
  recordUserLoggedIn,
} from "../lib/system-events.js";

export interface AuthUser {
  uid: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  actualRole: UserRole;
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
  const decoded = await getAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) {
    return reply.status(401).send({ error: "Invalid token" });
  }

  const tokenAuthTime = new Date(decoded.auth_time * 1000);
  let shouldRecordUserCreated = false;
  let shouldRecordLogin = false;
  let row = await db
    .selectFrom("users")
    .select([
      "id",
      "email",
      "display_name",
      "role",
      "last_login_at",
      "deleted_at",
    ])
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
        last_login_at: tokenAuthTime,
      })
      .returning([
        "id",
        "email",
        "display_name",
        "role",
        "last_login_at",
        "deleted_at",
      ])
      .executeTakeFirstOrThrow();
    shouldRecordUserCreated = true;
    shouldRecordLogin = true;
  } else if (row.deleted_at) {
    return reply.status(403).send({ error: "Account has been deleted" });
  } else if (!row.last_login_at || row.last_login_at < tokenAuthTime) {
    await db
      .updateTable("users")
      .set({ last_login_at: tokenAuthTime })
      .where("id", "=", row.id)
      .execute();

    row = {
      ...row,
      last_login_at: tokenAuthTime,
    };
    shouldRecordLogin = true;
  }

  if (shouldRecordUserCreated) {
    await recordUserCreated({
      userId: row.id,
      displayName: row.display_name,
      email: row.email,
    });
  }

  if (shouldRecordLogin) {
    await recordUserLoggedIn({
      userId: row.id,
      displayName: row.display_name,
      email: row.email,
      authTime: tokenAuthTime,
    });
  }

  const actualRole = userRoleSchema.parse(row.role);
  const requestedRoleHeader = request.headers["x-skate5-effective-role"];
  let requestedRole: UserRole | undefined;

  if (Array.isArray(requestedRoleHeader)) {
    return reply.status(400).send({ error: "Invalid effective role" });
  }

  if (typeof requestedRoleHeader === "string") {
    const parsedRole = userRoleSchema.safeParse(requestedRoleHeader);
    if (!parsedRole.success) {
      return reply.status(400).send({ error: "Invalid effective role" });
    }
    requestedRole = parsedRole.data;
  }

  const effectiveRole = requestedRole ?? actualRole;
  if (!canAssumeRole(actualRole, effectiveRole)) {
    return reply.status(403).send({ error: "Cannot assume effective role" });
  }

  request.user = {
    uid: row.id,
    firebaseUid: decoded.uid,
    email: row.email,
    role: effectiveRole,
    actualRole,
  };
};
