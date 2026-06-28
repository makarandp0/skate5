/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Dynamic client factory — iterates over the contract at runtime.
// Consumer-facing ApiClient type is fully typed.

import { z } from "zod";
import { contract, Contract, RouteDefinition } from "./contract.js";
import { userRoleSchema } from "./schemas.js";
import type { UserRole } from "./types.js";

type InferParams<R extends RouteDefinition> = R["params"] extends z.ZodType
  ? z.infer<R["params"]>
  : undefined;

type InferBody<R extends RouteDefinition> = R["body"] extends z.ZodType
  ? z.infer<R["body"]>
  : undefined;

type InferResponse<R extends RouteDefinition> = z.infer<R["response"]>;

type ClientArgs<R extends RouteDefinition> =
  R["params"] extends z.ZodType
    ? R["body"] extends z.ZodType
      ? { params: InferParams<R>; body: InferBody<R> }
      : { params: InferParams<R> }
    : R["body"] extends z.ZodType
      ? { body: InferBody<R> }
      : Record<string, never> | undefined;

export type ApiClient = {
  [K in keyof Contract]: ClientArgs<Contract[K]> extends Record<string, never> | undefined
    ? (args?: ClientArgs<Contract[K]>) => Promise<InferResponse<Contract[K]>>
    : (args: ClientArgs<Contract[K]>) => Promise<InferResponse<Contract[K]>>;
};

const buildPath = (
  template: string,
  params: Record<string, string> | undefined
): string => {
  if (!params) return template;
  return template.replace(/:(\w+)/g, (_, key: string) => encodeURIComponent(params[key]));
};

export const createApiClient = (options: {
  baseUrl: string;
  getToken: () => Promise<string>;
  getEffectiveRole?: () => UserRole | null;
}): ApiClient => {
  const client = {} as Record<string, (args: unknown) => Promise<unknown>>;

  for (const [name, route] of Object.entries(contract) as [string, RouteDefinition][]) {
    client[name] = async (args: unknown) => {
      const a = args as Record<string, unknown> | undefined;
      const path = buildPath(route.path, a?.params as Record<string, string> | undefined);
      const body =
        a && "body" in a ? JSON.stringify(a.body) : undefined;
      const headers: Record<string, string> = {};
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      if (route.auth !== "none") {
        const token = await options.getToken();
        headers.Authorization = `Bearer ${token}`;

        const effectiveRole = options.getEffectiveRole?.();
        if (effectiveRole) {
          headers["X-Skate5-Effective-Role"] =
            userRoleSchema.parse(effectiveRole);
        }
      }

      const res = await fetch(`${options.baseUrl}${path}`, {
        method: route.method,
        headers,
        body,
      });
      if (!res.ok) {
        throw new Error(`API error: ${String(res.status)} ${res.statusText}`);
      }
      return res.json() as Promise<unknown>;
    };
  }

  return client as unknown as ApiClient;
};
