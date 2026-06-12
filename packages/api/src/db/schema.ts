import {
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createId } from "../utils.js";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  photoUrl: text("photo_url"),
  role: varchar("role", { length: 20 }).notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const classes = pgTable("classes", {
  id: text("id").primaryKey().$defaultFn(createId),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  time: text("time"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  gridPublished: boolean("grid_published").notNull().default(false),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const signups = pgTable("signups", {
  id: text("id").primaryKey().$defaultFn(createId),
  classId: text("class_id").notNull().references(() => classes.id),
  userId: text("user_id").notNull().references(() => users.id),
  rsvp: varchar("rsvp", { length: 10 }).notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const badges = pgTable("badges", {
  id: text("id").primaryKey().$defaultFn(createId),
  text: text("text").notNull(),
  group: text("group"),
  color: varchar("color", { length: 30 }).notNull(),
});

export const gridEntries = pgTable("grid_entries", {
  id: text("id").primaryKey().$defaultFn(createId),
  classId: text("class_id").notNull().references(() => classes.id),
  order: integer("order").notNull().default(0),
  badgeId: text("badge_id").references(() => badges.id),
  time: text("time"),
  description: text("description"),
  instructorIds: jsonb("instructor_ids").$type<string[]>().notNull().default([]),
});

export const chats = pgTable("chats", {
  id: text("id").primaryKey().$defaultFn(createId),
  title: text("title"),
  topicId: text("topic_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(createId),
  chatId: text("chat_id").notNull().references(() => chats.id),
  userId: text("user_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMembers = pgTable("chat_members", {
  id: text("id").primaryKey().$defaultFn(createId),
  chatId: text("chat_id").notNull().references(() => chats.id),
  userId: text("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});
