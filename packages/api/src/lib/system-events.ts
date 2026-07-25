import { type SystemEventType, type UserRole } from "@skate5/shared";
import { type Kysely, type Transaction } from "kysely";
import { db } from "../db/index.js";
import { type Database } from "../db/types.js";

type SystemEventExecutor = Kysely<Database> | Transaction<Database>;

const getUserEventDetails = async (
  userId: string,
  executor: SystemEventExecutor
): Promise<{ displayName: string; email: string | null }> => {
  const row = await executor
    .selectFrom("users")
    .select(["display_name", "email"])
    .where("id", "=", userId)
    .executeTakeFirst();

  return {
    displayName: row?.display_name ?? "Someone",
    email: row?.email ?? null,
  };
};

export const recordSystemEvent = async ({
  type,
  actorUserId,
  subjectUserId,
  entityType,
  entityId,
  summary,
  metadata = {},
  executor = db,
}: {
  type: SystemEventType;
  actorUserId?: string | null;
  subjectUserId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  await executor
    .insertInto("system_events")
    .values({
      type,
      actor_user_id: actorUserId ?? null,
      subject_user_id: subjectUserId ?? null,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      summary,
      metadata,
    })
    .execute();
};

export const recordUserLoggedIn = async ({
  userId,
  displayName,
  email,
  authTime,
  executor = db,
}: {
  userId: string;
  displayName: string;
  email: string;
  authTime: Date;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  await recordSystemEvent({
    type: "auth.login",
    actorUserId: userId,
    subjectUserId: userId,
    entityType: "user",
    entityId: userId,
    summary: `${displayName} logged in.`,
    metadata: {
      email,
      authTime: authTime.toISOString(),
    },
    executor,
  });
};

export const recordUserCreated = async ({
  userId,
  displayName,
  email,
  executor = db,
}: {
  userId: string;
  displayName: string;
  email: string;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  await recordSystemEvent({
    type: "user.created",
    actorUserId: userId,
    subjectUserId: userId,
    entityType: "user",
    entityId: userId,
    summary: `${displayName} joined Skate5.`,
    metadata: {
      email,
    },
    executor,
  });
};

export const recordUserLoggedOut = async ({
  userId,
  executor = db,
}: {
  userId: string;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const user = await getUserEventDetails(userId, executor);

  await recordSystemEvent({
    type: "auth.logout",
    actorUserId: userId,
    subjectUserId: userId,
    entityType: "user",
    entityId: userId,
    summary: `${user.displayName} logged out.`,
    metadata: {
      email: user.email,
      source: "web",
    },
    executor,
  });
};

export const recordUserDeleted = async ({
  actorUserId,
  subjectUserId,
  executor = db,
}: {
  actorUserId: string;
  subjectUserId: string;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const [actor, subject] = await Promise.all([
    getUserEventDetails(actorUserId, executor),
    getUserEventDetails(subjectUserId, executor),
  ]);

  await recordSystemEvent({
    type: "user.deleted",
    actorUserId,
    subjectUserId,
    entityType: "user",
    entityId: subjectUserId,
    summary: `${actor.displayName} deleted ${subject.displayName}.`,
    metadata: {
      actorEmail: actor.email,
      subjectEmail: subject.email,
    },
    executor,
  });
};

export const recordUserUpdated = async ({
  actorUserId,
  subjectUserId,
  changedFields,
  executor = db,
}: {
  actorUserId: string;
  subjectUserId: string;
  changedFields: string[];
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const [actor, subject] = await Promise.all([
    getUserEventDetails(actorUserId, executor),
    getUserEventDetails(subjectUserId, executor),
  ]);

  await recordSystemEvent({
    type: "user.updated",
    actorUserId,
    subjectUserId,
    entityType: "user",
    entityId: subjectUserId,
    summary: `${actor.displayName} updated ${subject.displayName}.`,
    metadata: {
      actorEmail: actor.email,
      subjectEmail: subject.email,
      changedFields,
    },
    executor,
  });
};

export const recordUserRoleChanged = async ({
  actorUserId,
  subjectUserId,
  previousRole,
  nextRole,
  executor = db,
}: {
  actorUserId: string;
  subjectUserId: string;
  previousRole: UserRole;
  nextRole: UserRole;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const [actor, subject] = await Promise.all([
    getUserEventDetails(actorUserId, executor),
    getUserEventDetails(subjectUserId, executor),
  ]);

  await recordSystemEvent({
    type: "user.role_changed",
    actorUserId,
    subjectUserId,
    entityType: "user",
    entityId: subjectUserId,
    summary: `${actor.displayName} changed ${subject.displayName}'s role from ${previousRole} to ${nextRole}.`,
    metadata: {
      actorEmail: actor.email,
      subjectEmail: subject.email,
      previousRole,
      nextRole,
    },
    executor,
  });
};

export const recordClassCreated = async ({
  actorUserId,
  classId,
  date,
  time,
  status,
  locationSlug,
  executor = db,
}: {
  actorUserId: string;
  classId: string;
  date: string;
  time: string | null;
  status: string;
  locationSlug: string;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const actor = await getUserEventDetails(actorUserId, executor);

  await recordSystemEvent({
    type: "class.created",
    actorUserId,
    entityType: "class",
    entityId: classId,
    summary: `${actor.displayName} created a class for ${date}.`,
    metadata: {
      actorEmail: actor.email,
      date,
      time,
      status,
      locationSlug,
    },
    executor,
  });
};

export const recordClassUpdated = async ({
  actorUserId,
  classId,
  changedFields,
  date,
  time,
  status,
  locationSlug,
  executor = db,
}: {
  actorUserId: string;
  classId: string;
  changedFields: string[];
  date: string;
  time: string | null;
  status: string;
  locationSlug: string;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const actor = await getUserEventDetails(actorUserId, executor);

  await recordSystemEvent({
    type: "class.updated",
    actorUserId,
    entityType: "class",
    entityId: classId,
    summary: `${actor.displayName} updated the class for ${date}.`,
    metadata: {
      actorEmail: actor.email,
      changedFields,
      date,
      time,
      status,
      locationSlug,
    },
    executor,
  });
};

export const recordClassDeleted = async ({
  actorUserId,
  classId,
  date,
  time,
  locationSlug,
  executor = db,
}: {
  actorUserId: string;
  classId: string;
  date: string;
  time: string | null;
  locationSlug: string;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const actor = await getUserEventDetails(actorUserId, executor);

  await recordSystemEvent({
    type: "class.deleted",
    actorUserId,
    entityType: "class",
    entityId: classId,
    summary: `${actor.displayName} deleted the class for ${date}.`,
    metadata: {
      actorEmail: actor.email,
      date,
      time,
      locationSlug,
    },
    executor,
  });
};

export const recordGridPublished = async ({
  actorUserId,
  classId,
  published,
  date,
  executor = db,
}: {
  actorUserId: string;
  classId: string;
  published: boolean;
  date: string;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const actor = await getUserEventDetails(actorUserId, executor);

  await recordSystemEvent({
    type: published ? "grid.published" : "grid.unpublished",
    actorUserId,
    entityType: "class",
    entityId: classId,
    summary: published
      ? `${actor.displayName} published the grid for ${date}.`
      : `${actor.displayName} unpublished the grid for ${date}.`,
    metadata: {
      actorEmail: actor.email,
      published,
      date,
    },
    executor,
  });
};

export const recordEmailSent = async ({
  actorUserId,
  emailId,
  subject,
  toCount,
  ccCount,
  bccCount,
  executor = db,
}: {
  actorUserId: string;
  emailId: string;
  subject: string;
  toCount: number;
  ccCount: number;
  bccCount: number;
  executor?: SystemEventExecutor;
}): Promise<void> => {
  const actor = await getUserEventDetails(actorUserId, executor);

  await recordSystemEvent({
    type: "email.sent",
    actorUserId,
    entityType: "email",
    entityId: emailId,
    summary: `${actor.displayName} sent "${subject}".`,
    metadata: {
      actorEmail: actor.email,
      subject,
      toCount,
      ccCount,
      bccCount,
      recipientCount: toCount + ccCount + bccCount,
    },
    executor,
  });
};
