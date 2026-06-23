import { Generated } from "kysely";

export interface Database {
  users: UsersTable;
  classes: ClassesTable;
  signups: SignupsTable;
  badges: BadgesTable;
  grid_entries: GridEntriesTable;
  chats: ChatsTable;
  chat_messages: ChatMessagesTable;
  chat_members: ChatMembersTable;
}

export interface UsersTable {
  id: Generated<string>;
  firebase_uid: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  role: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface ClassesTable {
  id: Generated<string>;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  status: string;
  grid_published: Generated<boolean>;
  created_by: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SignupsTable {
  id: Generated<string>;
  class_id: string;
  user_id: string;
  rsvp: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface BadgesTable {
  id: Generated<string>;
  text: string;
  group: string | null;
  color: string;
}

export interface GridEntriesTable {
  id: Generated<string>;
  class_id: string;
  order: Generated<number>;
  badge_id: string | null;
  time: string | null;
  description: string | null;
  instructor_ids: Generated<string[]>;
}

export interface ChatsTable {
  id: Generated<string>;
  title: string | null;
  topic_id: string | null;
  created_at: Generated<Date>;
}

export interface ChatMessagesTable {
  id: Generated<string>;
  chat_id: string;
  user_id: string;
  kind: string;
  text: string;
  created_at: Generated<Date>;
}

export interface ChatMembersTable {
  id: Generated<string>;
  chat_id: string;
  user_id: string;
  joined_at: Generated<Date>;
}
