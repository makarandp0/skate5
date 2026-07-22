import { z } from "zod";
import {
  userRoleSchema,
  manageableUserRoleSchema,
  rsvpStatusSchema,
  editableClassStatusSchema,
  classStatusSchema,
  chatMessageKindSchema,
  locationSchema,
  userSchema,
  managedUserSchema,
  skateClassSchema,
  classListItemSchema,
  signupSchema,
  classAttendancePersonSchema,
  classAttendanceResponseSchema,
  badgeSchema,
  gridEntrySchema,
  gridInstructorSchema,
  classGridResponseSchema,
  gridCopySourceSchema,
  chatSchema,
  chatMessageSchema,
  classChatResponseSchema,
  firebaseClientConfigSchema,
  createClassSchema,
  updateClassSchema,
  updateUserSchema,
  rsvpRequestSchema,
  createBadgeSchema,
  createGridEntrySchema,
  updateGridEntrySchema,
  copyGridEntriesSchema,
  reorderGridEntriesSchema,
  publishGridSchema,
  sendMessageSchema,
  sendEmailSchema,
  sendEmailResponseSchema,
} from "./schemas.js";

export type UserRole = z.infer<typeof userRoleSchema>;
export type ManageableUserRole = z.infer<typeof manageableUserRoleSchema>;
export type RsvpStatus = z.infer<typeof rsvpStatusSchema>;
export type EditableClassStatus = z.infer<typeof editableClassStatusSchema>;
export type ClassStatus = z.infer<typeof classStatusSchema>;
export type ChatMessageKind = z.infer<typeof chatMessageKindSchema>;
export type Location = z.infer<typeof locationSchema>;
export type User = z.infer<typeof userSchema>;
export type ManagedUser = z.infer<typeof managedUserSchema>;
export type SkateClass = z.infer<typeof skateClassSchema>;
export type ClassListItem = z.infer<typeof classListItemSchema>;
export type Signup = z.infer<typeof signupSchema>;
export type ClassAttendancePerson = z.infer<
  typeof classAttendancePersonSchema
>;
export type ClassAttendanceResponse = z.infer<
  typeof classAttendanceResponseSchema
>;
export type Badge = z.infer<typeof badgeSchema>;
export type GridEntry = z.infer<typeof gridEntrySchema>;
export type GridInstructor = z.infer<typeof gridInstructorSchema>;
export type ClassGridResponse = z.infer<typeof classGridResponseSchema>;
export type GridCopySource = z.infer<typeof gridCopySourceSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ClassChatResponse = z.infer<typeof classChatResponseSchema>;
export type FirebaseClientConfig = z.infer<typeof firebaseClientConfigSchema>;
export type SendEmailResponse = z.infer<typeof sendEmailResponseSchema>;

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type RsvpRequest = z.infer<typeof rsvpRequestSchema>;
export type CreateBadgeInput = z.infer<typeof createBadgeSchema>;
export type CreateGridEntryInput = z.infer<typeof createGridEntrySchema>;
export type UpdateGridEntryInput = z.infer<typeof updateGridEntrySchema>;
export type CopyGridEntriesInput = z.infer<typeof copyGridEntriesSchema>;
export type ReorderGridEntriesInput = z.infer<typeof reorderGridEntriesSchema>;
export type PublishGridInput = z.infer<typeof publishGridSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
