import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const splitStatus = pgEnum("split_status", ["open", "closed"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  venmoHandle: text("venmo_handle"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const splits = pgTable("splits", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull(),
  name: text("name").notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  tip: numeric("tip", { precision: 12, scale: 2 }).notNull().default("0"),
  status: splitStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const splitItems = pgTable("split_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  splitId: uuid("split_id")
    .notNull()
    .references(() => splits.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  rawOcrLine: text("raw_ocr_line"),
});

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  splitId: uuid("split_id")
    .notNull()
    .references(() => splits.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  venmoHandle: text("venmo_handle"),
  totalOwed: numeric("total_owed", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  paid: boolean("paid").notNull().default(false),
});

export const itemAssignments = pgTable("item_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => splitItems.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  shareFraction: numeric("share_fraction", { precision: 6, scale: 4 })
    .notNull()
    .default("1"),
});

export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  splitId: uuid("split_id")
    .notNull()
    .references(() => splits.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  ocrRaw: text("ocr_raw"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const friends = pgTable("friends", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  venmoHandle: text("venmo_handle"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
