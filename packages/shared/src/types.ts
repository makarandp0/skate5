export type UserRole = "admin" | "instructor" | "member";

export type RsvpStatus = "yes" | "no" | "maybe" | "none";

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface SkateClass {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  status: "draft" | "published" | "cancelled";
  gridPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Signup {
  id: string;
  classId: string;
  userId: string;
  rsvp: RsvpStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  id: string;
  text: string;
  group: string | null;
  color: string;
}

export interface GridEntry {
  id: string;
  classId: string;
  order: number;
  badgeId: string | null;
  time: string | null;
  description: string | null;
  instructorIds: string[];
}

export interface Chat {
  id: string;
  title: string | null;
  topicId: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  createdAt: string;
}
