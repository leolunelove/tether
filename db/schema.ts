import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const spaces = sqliteTable("spaces", {
  id: text("id").primaryKey(),
  aToken: text("a_token").notNull(),
  bToken: text("b_token"),
  aName: text("a_name").notNull(),
  bName: text("b_name"),
  invite: text("invite"),
  holder: integer("holder").notNull().default(0),
  revision: integer("revision").notNull().default(0),
  listened: integer("listened").notNull().default(1),
  audioKey: text("audio_key"),
  audioType: text("audio_type"),
  duration: integer("duration").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [uniqueIndex("idx_spaces_a_token").on(table.aToken), uniqueIndex("idx_spaces_b_token").on(table.bToken), uniqueIndex("idx_spaces_invite").on(table.invite)]);
