import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/**
 * Intro copy for the long-tail landing pages (open-air cinema, classics per
 * month), keyed by page, e.g. "open-air", "open-air:lodz", "classic:2026-11".
 * Written by the scraper's AI step, read by the frontend.
 */
export const landingIntrosTable = pgTable('landing_intros', {
  key: varchar({ length: 128 }).primaryKey(),
  content: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type LandingIntro = typeof landingIntrosTable.$inferSelect;
