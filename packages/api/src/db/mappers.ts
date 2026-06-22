import {
  classAttendancePersonSchema,
  userRoleSchema,
  type User,
  type UserRole,
  type SkateClass,
  type Signup,
  type ClassAttendancePerson,
  type Badge,
} from "@skate5/shared";

interface UserRow {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

const assertUserRole = (s: string): User["role"] => {
  return userRoleSchema.parse(s);
};

export const toUser = (row: UserRow, effectiveRole?: UserRole): User => {
  const actualRole = assertUserRole(row.role);

  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    email: row.email,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: effectiveRole ?? actualRole,
    actualRole,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
};

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

interface ClassAttendancePersonRow {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  rsvp: string | null;
  signup_id: string | null;
}

interface BadgeRow {
  id: string;
  text: string;
  group: string | null;
  color: string;
}

const assertClassStatus = (s: string): SkateClass["status"] => {
  if (s === "draft" || s === "published" || s === "cancelled") return s;
  throw new Error(`Invalid class status: ${s}`);
};

const assertRsvpStatus = (s: string): Signup["rsvp"] => {
  if (s === "yes" || s === "no" || s === "maybe" || s === "none") return s;
  throw new Error(`Invalid rsvp status: ${s}`);
};

export const toSkateClass = (row: ClassRow): SkateClass => {
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
};

export const toSignup = (row: SignupRow): Signup => {
  return {
    id: row.id,
    classId: row.class_id,
    userId: row.user_id,
    rsvp: assertRsvpStatus(row.rsvp),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
};

export const toClassAttendancePerson = (
  row: ClassAttendancePersonRow
): ClassAttendancePerson => {
  return classAttendancePersonSchema.parse({
    userId: row.user_id,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    rsvp: row.rsvp ?? "none",
    signupId: row.signup_id,
  });
};

export const toBadge = (row: BadgeRow): Badge => {
  return row;
};
