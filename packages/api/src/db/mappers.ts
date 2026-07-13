import {
  classAttendancePersonSchema,
  chatMessageKindSchema,
  gridEntrySchema,
  gridInstructorSchema,
  managedUserSchema,
  userRoleSchema,
  type User,
  type ManagedUser,
  type UserRole,
  type SkateClass,
  type Signup,
  type ClassAttendancePerson,
  type Badge,
  type GridEntry,
  type GridInstructor,
  type Chat,
  type ChatMessage,
} from "@skate5/shared";

interface UserRow {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  role: string;
  last_login_at: Date | null;
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
    lastLoginAt: row.last_login_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
};

export const toManagedUser = (row: UserRow): ManagedUser => {
  return managedUserSchema.parse({
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: assertUserRole(row.role),
    lastLoginAt: row.last_login_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });
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

interface GridEntryRow {
  id: string;
  class_id: string;
  order: number;
  badge_id: string | null;
  time: string | null;
  description: string | null;
  instructor_ids: unknown;
}

interface GridInstructorRow {
  user_id: string;
  email: string | null;
  display_name: string;
  photo_url: string | null;
  rsvp: string | null;
}

interface ChatRow {
  id: string;
  title: string | null;
  topic_id: string | null;
  created_at: Date;
}

interface ChatMessageRow {
  id: string;
  chat_id: string;
  user_id: string;
  user_display_name: string;
  user_photo_url: string | null;
  kind: string;
  text: string;
  created_at: Date;
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

export const toGridEntry = (row: GridEntryRow): GridEntry => {
  return gridEntrySchema.parse({
    id: row.id,
    classId: row.class_id,
    order: row.order,
    badgeId: row.badge_id,
    time: row.time,
    description: row.description,
    instructorIds: row.instructor_ids,
  });
};

export const toGridInstructor = (row: GridInstructorRow): GridInstructor => {
  return gridInstructorSchema.parse({
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    rsvp: row.rsvp ?? "none",
  });
};

export const toChat = (row: ChatRow): Chat => {
  return {
    id: row.id,
    title: row.title,
    topicId: row.topic_id,
    createdAt: row.created_at.toISOString(),
  };
};

export const toChatMessage = (row: ChatMessageRow): ChatMessage => {
  return {
    id: row.id,
    chatId: row.chat_id,
    userId: row.user_id,
    userDisplayName: row.user_display_name,
    userPhotoUrl: row.user_photo_url,
    kind: chatMessageKindSchema.parse(row.kind),
    text: row.text,
    createdAt: row.created_at.toISOString(),
  };
};
