import {
  customType,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// Short-lived storage for rendered social media images: Instagram ingests
// media from a public URL, so the rendered JPEG is parked here just long
// enough for the Graph API to fetch it. Rows are pruned on insert.
export const socialsImagesTable = pgTable('socials_images', {
  id: uuid().primaryKey().defaultRandom(),
  data: bytea('data').notNull(),
  contentType: varchar({ length: 100 }).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export type SocialsImage = typeof socialsImagesTable.$inferSelect;
