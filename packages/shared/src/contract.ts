import { z } from "zod";
import {
  userSchema,
  skateClassSchema,
  signupSchema,
  rsvpStatusSchema,
  classAttendanceResponseSchema,
  badgeSchema,
  createClassSchema,
  updateClassSchema,
  rsvpRequestSchema,
  createBadgeSchema,
  firebaseClientConfigSchema,
} from "./schemas.js";

export type RouteDefinition = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  auth?: "required" | "none";
  params?: z.ZodType;
  body?: z.ZodType;
  response: z.ZodType;
};

export const contract = {
  getConfig: {
    method: "GET",
    path: "/config",
    auth: "none",
    response: firebaseClientConfigSchema,
  },
  getMe: {
    method: "GET",
    path: "/me",
    response: userSchema,
  },
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
  updateClass: {
    method: "PUT",
    path: "/classes/:id",
    params: z.object({ id: z.string() }),
    body: updateClassSchema,
    response: skateClassSchema,
  },
  getClassSignups: {
    method: "GET",
    path: "/classes/:id/signups",
    params: z.object({ id: z.string() }),
    response: z.array(signupSchema),
  },
  getClassAttendance: {
    method: "GET",
    path: "/classes/:id/attendance/:rsvp",
    params: z.object({ id: z.string(), rsvp: rsvpStatusSchema }),
    response: classAttendanceResponseSchema,
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
