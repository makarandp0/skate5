import type { SkateClass, Signup, Badge } from "@skate5/shared";

interface ClassRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  status: string;
  grid_published: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface SignupRow {
  id: string;
  class_id: string;
  user_id: string;
  rsvp: string;
  created_at: Date;
  updated_at: Date;
}

interface BadgeRow {
  id: string;
  text: string;
  group: string | null;
  color: string;
}

function assertClassStatus(s: string): SkateClass["status"] {
  if (s === "draft" || s === "published" || s === "cancelled") return s;
  throw new Error(`Invalid class status: ${s}`);
}

function assertRsvpStatus(s: string): Signup["rsvp"] {
  if (s === "yes" || s === "no" || s === "maybe" || s === "none") return s;
  throw new Error(`Invalid rsvp status: ${s}`);
}

export function toSkateClass(row: ClassRow): SkateClass {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    status: assertClassStatus(row.status),
    gridPublished: row.grid_published,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toSignup(row: SignupRow): Signup {
  return {
    id: row.id,
    classId: row.class_id,
    userId: row.user_id,
    rsvp: assertRsvpStatus(row.rsvp),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toBadge(row: BadgeRow): Badge {
  return row;
}
