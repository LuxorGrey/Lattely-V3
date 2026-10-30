import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  unique,
} from "drizzle-orm/pg-core";

export const shopStatus = pgEnum("shop_status", [
  "pending",
  "live",
  "rejected",
  "closed",
]);

export const shops = pgTable("shops", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  address: text().notNull(),
  instagramOrWebsite: text("instagram_or_website"),
  status: shopStatus().notNull(),
});

export const ratings = pgTable(
  "ratings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    // shortcut: plain text until Members exist; make it a foreign key when sign-in lands.
    memberId: text("member_id").notNull(),
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id),
    stars: integer().notNull(),
  },
  (table) => [
    unique().on(table.memberId, table.shopId), // one Rating per Member per Shop
    check("stars_1_to_5", sql`${table.stars} between 1 and 5`),
  ],
);
