import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "firebase-admin/auth";

export interface AuthUser {
  uid: string;
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
    request.user = { uid: decoded.uid, email: decoded.email ?? "" };
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}
