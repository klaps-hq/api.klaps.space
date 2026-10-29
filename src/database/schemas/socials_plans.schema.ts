import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// Upcoming social media posts prepared by klaps.radar ahead of time with the
// same code that publishes them (candidate pick, art pick, render,
// caption), so the admin panel can show exactly what will go out. Rows are
// kept after publishing (status "published") as the post history.
export const socialsPlansTable = pgTable(
  'socials_plans',
  {
    id: uuid().primaryKey().defaultRandom(),
    // Stable per slot: "<slotAt ISO>|<platform>|<format>".
    slotKey: varchar({ length: 200 }).notNull().unique(),
    slotAt: timestamp().notNull(),
    platform: varchar({ length: 30 }).notNull(),
    // Human label of the slot, e.g. "Reel · Klasyka tygodnia".
    format: varchar({ length: 100 }).notNull(),
    // 'pending' (beyond the planning horizon) | 'planned' | 'skipped'
    // | 'published' | 'failed'
    status: varchar({ length: 20 }).notNull(),
    reason: text(),
    screeningIds: jsonb().$type<number[]>().notNull().default([]),
    caption: text(),
    publishedAt: timestamp(),
    // Platform media id / permalink once published.
    externalId: varchar({ length: 100 }),
    permalink: text(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => [index('socials_plans_slot_at_idx').on(table.slotAt)],
);

// Rendered images of a plan (post, story, carousel slides, reel still).
export const socialsPlanMediaTable = pgTable(
  'socials_plan_media',
  {
    id: uuid().primaryKey().defaultRandom(),
    planId: uuid()
      .notNull()
      .references(() => socialsPlansTable.id, { onDelete: 'cascade' }),
    position: integer().notNull().default(0),
    contentType: varchar({ length: 100 }).notNull(),
    data: bytea('data').notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [index('socials_plan_media_plan_idx').on(table.planId)],
);

export type SocialsPlan = typeof socialsPlansTable.$inferSelect;
export type NewSocialsPlan = typeof socialsPlansTable.$inferInsert;
export type SocialsPlanMedia = typeof socialsPlanMediaTable.$inferSelect;
