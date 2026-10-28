/**
 * Keys name the landing page an intro belongs to: "open-air",
 * "open-air:lodz", "classic", "classic:2026-11". Lowercase slugs joined by
 * colons, so a typo in a writer cannot create keys no page will ever read.
 */
export const LANDING_INTRO_KEY_PATTERN = /^[a-z0-9-]+(:[a-z0-9-]+)*$/;
export const LANDING_INTRO_KEY_MAX_LENGTH = 128;
export const LANDING_INTRO_MAX_LENGTH = 2000;
