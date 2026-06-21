/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-argument */
// This module performs dynamic route registration — type assertions are
// unavoidable here since we iterate over the contract at runtime. All public
// types exposed to consumers (RouteHandlers, ApiClient) remain fully typed.

import { contract, RouteDefinition } from "./contract.js";
import { RouteHandlers } from "./handler.js";

interface FastifyRequest {
  body: unknown;
  params: unknown;
  user?: { uid: string; email: string };
}

interface FastifyReply {
  status(code: number): FastifyReply;
  send(payload: unknown): void;
}

export interface FastifyLike {
  get(path: string, handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>): void;
  post(path: string, handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>): void;
  put(path: string, handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>): void;
  delete(path: string, handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>): void;
}

type HttpMethod = "get" | "post" | "put" | "delete";

export const registerRoutes = (
  app: FastifyLike,
  handlers: RouteHandlers
): void => {
  for (const [name, route] of Object.entries(contract) as [
    keyof typeof contract,
    RouteDefinition,
  ][]) {
    const handler = handlers[name];
    if (!handler) continue;

    const method = route.method.toLowerCase() as HttpMethod;

    app[method](route.path, async (req: FastifyRequest) => {
      const body = route.body ? route.body.parse(req.body) : undefined;
      const params = route.params ? route.params.parse(req.params) : {};

      const result: unknown = await handler({ params, body, user: req.user! } as any);
      return result;
    });
  }
};
