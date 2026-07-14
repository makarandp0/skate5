import { z } from "zod";
import {
  userSchema,
  managedUserSchema,
  skateClassSchema,
  classListItemSchema,
  signupSchema,
  rsvpStatusSchema,
  classAttendanceResponseSchema,
  classChatResponseSchema,
  chatMessageSchema,
  badgeSchema,
  classGridResponseSchema,
  createClassSchema,
  updateClassSchema,
  updateUserRoleSchema,
  rsvpRequestSchema,
  sendMessageSchema,
  createBadgeSchema,
  createGridEntrySchema,
  updateGridEntrySchema,
  reorderGridEntriesSchema,
  publishGridSchema,
  firebaseClientConfigSchema,
  sendEmailSchema,
  sendEmailResponseSchema,
  locationSchema,
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
  getUsers: {
    method: "GET",
    path: "/users",
    response: z.array(managedUserSchema),
  },
  updateUserRole: {
    method: "PUT",
    path: "/users/:id/role",
    params: z.object({ id: z.string() }),
    body: updateUserRoleSchema,
    response: managedUserSchema,
  },
  getClasses: {
    method: "GET",
    path: "/classes",
    response: z.array(classListItemSchema),
  },
  getLocations: {
    method: "GET",
    path: "/locations",
    response: z.array(locationSchema),
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
  setUserRsvp: {
    method: "PUT",
    path: "/classes/:id/attendance/:userId/rsvp",
    params: z.object({ id: z.string(), userId: z.string() }),
    body: rsvpRequestSchema,
    response: z.object({ ok: z.boolean() }),
  },
  getClassChat: {
    method: "GET",
    path: "/classes/:id/chat",
    params: z.object({ id: z.string() }),
    response: classChatResponseSchema,
  },
  sendClassChatMessage: {
    method: "POST",
    path: "/classes/:id/chat/messages",
    params: z.object({ id: z.string() }),
    body: sendMessageSchema,
    response: chatMessageSchema,
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
  getClassGrid: {
    method: "GET",
    path: "/classes/:id/grid",
    params: z.object({ id: z.string() }),
    response: classGridResponseSchema,
  },
  createClassGridEntry: {
    method: "POST",
    path: "/classes/:id/grid/entries",
    params: z.object({ id: z.string() }),
    body: createGridEntrySchema,
    response: classGridResponseSchema,
  },
  updateClassGridEntry: {
    method: "PUT",
    path: "/classes/:id/grid/entries/:entryId",
    params: z.object({ id: z.string(), entryId: z.string() }),
    body: updateGridEntrySchema,
    response: classGridResponseSchema,
  },
  deleteClassGridEntry: {
    method: "DELETE",
    path: "/classes/:id/grid/entries/:entryId",
    params: z.object({ id: z.string(), entryId: z.string() }),
    response: classGridResponseSchema,
  },
  reorderClassGridEntries: {
    method: "PUT",
    path: "/classes/:id/grid/order",
    params: z.object({ id: z.string() }),
    body: reorderGridEntriesSchema,
    response: classGridResponseSchema,
  },
  duplicatePreviousClassGrid: {
    method: "POST",
    path: "/classes/:id/grid/duplicate-previous",
    params: z.object({ id: z.string() }),
    response: classGridResponseSchema,
  },
  publishClassGrid: {
    method: "PUT",
    path: "/classes/:id/grid/publish",
    params: z.object({ id: z.string() }),
    body: publishGridSchema,
    response: classGridResponseSchema,
  },
  sendEmail: {
    method: "POST",
    path: "/emails",
    body: sendEmailSchema,
    response: sendEmailResponseSchema,
  },
} as const satisfies Record<string, RouteDefinition>;

export type Contract = typeof contract;
