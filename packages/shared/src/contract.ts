import { z } from "zod";
import {
  skateClassSchema,
  signupSchema,
  badgeSchema,
  createClassSchema,
  rsvpRequestSchema,
  createBadgeSchema,
} from "./schemas.js";

export type RouteDefinition = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  params?: z.ZodType;
  body?: z.ZodType;
  response: z.ZodType;
};

export const contract = {
  getClasses: {
    method: "GET",
    path: "/classes",
    response: z.array(skateClassSchema),
  },
  getClass: {
    method: "GET",
    path: "/classes/:id",
    params: z.object({ id: z.string() }),
    response: skateClassSchema.nullable(),
  },
  createClass: {
    method: "POST",
    path: "/classes",
    body: createClassSchema,
    response: skateClassSchema,
  },
  getClassSignups: {
    method: "GET",
    path: "/classes/:id/signups",
    params: z.object({ id: z.string() }),
    response: z.array(signupSchema),
  },
  rsvp: {
    method: "POST",
    path: "/classes/:id/rsvp",
    params: z.object({ id: z.string() }),
    body: rsvpRequestSchema,
    response: z.object({ ok: z.boolean() }),
  },
  getBadges: {
    method: "GET",
    path: "/badges",
    response: z.array(badgeSchema),
  },
  createBadge: {
    method: "POST",
    path: "/badges",
    body: createBadgeSchema,
    response: badgeSchema,
  },
} as const satisfies Record<string, RouteDefinition>;

export type Contract = typeof contract;
