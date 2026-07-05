import { z } from "zod";

export const userRoleSchema = z.enum([
  "developer",
  "admin",
  "instructor",
  "member",
]);

export const rsvpStatusSchema = z.enum(["yes", "no", "maybe", "none"]);

export const classStatusSchema = z.enum(["draft", "published", "cancelled"]);

export const chatMessageKindSchema = z.enum(["user", "system"]);

export const userSchema = z.object({
  id: z.string(),
  firebaseUid: z.string(),
  email: z.email(),
  displayName: z.string(),
  photoUrl: z.string().nullable(),
  role: userRoleSchema,
  actualRole: userRoleSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const skateClassSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  date: z.string(),
  time: z.string().nullable(),
  status: classStatusSchema,
  gridPublished: z.boolean(),
  createdBy: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const signupSchema = z.object({
  id: z.string(),
  classId: z.string(),
  userId: z.string(),
  rsvp: rsvpStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const classAttendancePersonSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  photoUrl: z.string().nullable(),
  rsvp: rsvpStatusSchema,
  signupId: z.string().nullable(),
});

export const classAttendanceCountsSchema = z.object({
  yes: z.int().nonnegative(),
  maybe: z.int().nonnegative(),
  no: z.int().nonnegative(),
  none: z.int().nonnegative(),
});

export const classAttendanceResponseSchema = z.object({
  counts: classAttendanceCountsSchema,
  currentUserRsvp: rsvpStatusSchema,
  people: z.array(classAttendancePersonSchema),
});

export const badgeSchema = z.object({
  id: z.string(),
  text: z.string(),
  group: z.string().nullable(),
  color: z.string(),
});

export const gridEntrySchema = z.object({
  id: z.string(),
  classId: z.string(),
  order: z.int(),
  badgeId: z.string().nullable(),
  time: z.string().nullable(),
  description: z.string().nullable(),
  instructorIds: z.array(z.string()),
});

export const gridInstructorSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  photoUrl: z.string().nullable(),
  rsvp: rsvpStatusSchema,
});

export const classGridResponseSchema = z.object({
  class: skateClassSchema,
  entries: z.array(gridEntrySchema),
  badges: z.array(badgeSchema),
  instructors: z.array(gridInstructorSchema),
});

export const chatSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  topicId: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  userId: z.string(),
  userDisplayName: z.string(),
  userPhotoUrl: z.string().nullable(),
  kind: chatMessageKindSchema,
  text: z.string(),
  createdAt: z.iso.datetime(),
});

export const classChatResponseSchema = z.object({
  chat: chatSchema,
  messages: z.array(chatMessageSchema),
});

export const firebaseClientConfigSchema = z.object({
  apiKey: z.string(),
  authDomain: z.string(),
  projectId: z.string(),
  appId: z.string(),
  commitSha: z.string().min(1).nullable(),
});

// Request/input schemas for API endpoints

export const createClassSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.iso.date(),
  time: z.string().optional(),
  status: classStatusSchema.default("draft"),
});

export const updateClassSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  time: z.string().optional(),
  status: classStatusSchema.default("draft"),
});

export const rsvpRequestSchema = z.object({
  rsvp: rsvpStatusSchema,
});

export const createBadgeSchema = z.object({
  text: z.string().min(1),
  group: z.string().optional(),
  color: z.string().min(1),
});

export const createGridEntrySchema = z.object({
  order: z.int().default(0),
  badgeId: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  instructorIds: z.array(z.string()).default([]),
});

export const updateGridEntrySchema = z.object({
  order: z.int(),
  badgeId: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  instructorIds: z.array(z.string()),
});

export const reorderGridEntriesSchema = z.object({
  entryIds: z.array(z.string()).min(1),
});

export const publishGridSchema = z.object({
  published: z.boolean(),
});

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1),
});

const emailAddressListSchema = z.array(z.email()).max(50);

export const sendEmailSchema = z
  .object({
    to: emailAddressListSchema.min(1),
    cc: emailAddressListSchema.default([]),
    bcc: emailAddressListSchema.default([]),
    subject: z.string().trim().min(1).max(200),
    text: z.string().trim().max(50_000).optional(),
    html: z.string().trim().max(100_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.text && !value.html) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a plain text or HTML body.",
        path: ["text"],
      });
    }
  });

export const sendEmailResponseSchema = z.object({
  id: z.string().min(1),
});
