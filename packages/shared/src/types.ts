import { z } from "zod";
import {
  userRoleSchema,
  rsvpStatusSchema,
  classStatusSchema,
  userSchema,
  skateClassSchema,
  signupSchema,
  classAttendancePersonSchema,
  classAttendanceResponseSchema,
  badgeSchema,
  gridEntrySchema,
  chatSchema,
  chatMessageSchema,
  firebaseClientConfigSchema,
  createClassSchema,
  rsvpRequestSchema,
  createBadgeSchema,
  createGridEntrySchema,
  sendMessageSchema,
} from "./schemas.js";

export type UserRole = z.infer<typeof userRoleSchema>;
export type RsvpStatus = z.infer<typeof rsvpStatusSchema>;
export type ClassStatus = z.infer<typeof classStatusSchema>;
export type User = z.infer<typeof userSchema>;
export type SkateClass = z.infer<typeof skateClassSchema>;
export type Signup = z.infer<typeof signupSchema>;
export type ClassAttendancePerson = z.infer<
  typeof classAttendancePersonSchema
>;
export type ClassAttendanceResponse = z.infer<
  typeof classAttendanceResponseSchema
>;
export type Badge = z.infer<typeof badgeSchema>;
export type GridEntry = z.infer<typeof gridEntrySchema>;
export type Chat = z.infer<typeof chatSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type FirebaseClientConfig = z.infer<typeof firebaseClientConfigSchema>;

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type RsvpRequest = z.infer<typeof rsvpRequestSchema>;
export type CreateBadgeInput = z.infer<typeof createBadgeSchema>;
export type CreateGridEntryInput = z.infer<typeof createGridEntrySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
