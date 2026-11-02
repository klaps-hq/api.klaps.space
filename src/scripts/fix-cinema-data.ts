/**
 * Hand corrections of cinema data that the scraper must not undo (KLA-58).
 *
 * Fix mode (default) runs in one transaction and rolls it back unless
 * --commit is passed:
 *   - artKino Krosno: street "Bieszadzka 1" -> "Bieszczadzka 1", locked with
 *     `streetLocked` so the next scrape keeps it, postal code 38-400.
 *   - Skierniewice: "Centrum Kultury i Sztuki" (the operator) and "Polonez"
 *     (its venue) are one place listed twice on Filmweb. The operator row
 *     gets `duplicateOfId` = Polonez, which drops it from city lists, cinema
 *     counts, search and the sitemap.
 *   - Any extra pair passed as --mark <duplicate-slug>=<canonical-slug>
 *     (repeatable), e.g. one found with --list-duplicates.
 *
 * `postalCode` and `duplicateOfId` are not in the scraper upsert, and a
 * locked street is kept by it, so every fix here survives the next scrape.
 * `updatedAt` is bumped on the corrected cinemas, so the sitemap advertises
 * the changed pages. The script is idempotent.
 *
 * --list-duplicates only reads: it prints pairs of cinemas in the same city
 * with the same normalised street or coordinates closer than
 * DUPLICATE_DISTANCE_M, with their upcoming screening counts, as candidates
 * for --mark. Review each pair by hand: two screens of one venue, or a summer
 * cinema in a courtyard of a museum, can legitimately share an address.
 *
 * Usage:
 *   bunx ts-node -r dotenv/config src/scripts/fix-cinema-data.ts [--commit]
 *     [--mark <duplicate-slug>=<canonical-slug> ...]
 *   bunx ts-node -r dotenv/config src/scripts/fix-cinema-data.ts --list-duplicates
 */
import 'dotenv/config';
import { Client } from 'pg';

/** Coordinates closer than this (metres) flag a likely duplicate. */
const DUPLICATE_DISTANCE_M = 150;

interface CinemaRow {
  id: number;
  sourceId: number;
  slug: string;
  name: string;
  street: string | null;
  streetLocked: boolean;
  postalCode: string | null;
  phone: string | null;
  duplicateOfId: number | null;
  upcoming: number;
}

interface DuplicateMark {
  duplicateSlug: string;
  canonicalSlug: string;
}

const CINEMA_COLUMNS = `
  c.id, c."sourceId", c.slug, c.name, c.street, c."streetLocked",
  c."postalCode", c.phone, c."duplicateOfId",
  (SELECT count(*)::int FROM screenings s
    WHERE s."cinemaId" = c."sourceId" AND s.date >= now()) AS upcoming`;

const summarize = (c: CinemaRow): string =>
  `${c.name} [${c.slug}, id ${c.id}] street=${JSON.stringify(c.street)}` +
  ` locked=${c.streetLocked} postalCode=${JSON.stringify(c.postalCode)}` +
  ` duplicateOfId=${c.duplicateOfId ?? 'null'} upcoming=${c.upcoming}`;

const findBySlug = async (
  client: Client,
  slug: string,
): Promise<CinemaRow | null> => {
  const res = await client.query<CinemaRow>(
    `SELECT ${CINEMA_COLUMNS} FROM cinemas c WHERE c.slug = $1`,
    [slug],
  );
  return res.rows[0] ?? null;
};

/** The only cinema in a city whose name matches `pattern` (ILIKE). */
const findOneInCity = async (
  client: Client,
  citySlug: string,
  pattern: string,
): Promise<CinemaRow | null> => {
  const res = await client.query<CinemaRow>(
    `SELECT ${CINEMA_COLUMNS}
       FROM cinemas c
       JOIN cities ci ON ci."sourceId" = c."sourceCityId"
      WHERE ci.slug = $1 AND c.name ILIKE $2`,
    [citySlug, pattern],
  );
  if (res.rows.length !== 1) {
    console.warn(
      `  ! expected one cinema matching ${pattern} in ${citySlug}, found ${res.rows.length}` +
        res.rows.map((r) => `\n      ${summarize(r)}`).join(''),
    );
    return null;
  }
  return res.rows[0];
};

const fixArtKinoKrosno = async (client: Client): Promise<void> => {
  console.log('artKino Krosno:');
  const cinema = await findBySlug(client, 'artkino');
  if (!cinema) {
    console.warn('  ! no cinema with slug "artkino", skipped');
    return;
  }
  console.log(`  before: ${summarize(cinema)}`);
  if (cinema.street !== 'Bieszadzka 1' && cinema.street !== 'Bieszczadzka 1') {
    console.warn(
      `  ! unexpected street ${JSON.stringify(cinema.street)}, is this the Krosno venue? skipped`,
    );
    return;
  }
  await client.query(
    `UPDATE cinemas
        SET street = 'Bieszczadzka 1', "streetLocked" = true,
            "postalCode" = '38-400', "updatedAt" = now()
      WHERE id = $1
        AND (street, "streetLocked", "postalCode")
            IS DISTINCT FROM ('Bieszczadzka 1', true, '38-400')`,
    [cinema.id],
  );
  const after = await findBySlug(client, 'artkino');
  console.log(`  after:  ${after ? summarize(after) : '?'}`);
  // The second number (+48 506 789 249) does not fit the single-number phone
  // field; it stays a manual decision (see KLA-58).
  console.log(
    `  note: phone is ${JSON.stringify(cinema.phone)}; +48 506 789 249 is not added`,
  );
};

const markDuplicate = async (
  client: Client,
  duplicate: CinemaRow,
  canonical: CinemaRow,
): Promise<void> => {
  console.log(`  duplicate: ${summarize(duplicate)}`);
  console.log(`  canonical: ${summarize(canonical)}`);
  if (duplicate.id === canonical.id || canonical.duplicateOfId !== null) {
    console.warn('  ! canonical cinema is itself a duplicate, skipped');
    return;
  }
  if (duplicate.upcoming > 0) {
    // Screenings stay on the row the scraper files them under, so they keep
    // showing in the repertoire, labelled with the duplicate's name.
    console.warn(
      `  ! the duplicate still has ${duplicate.upcoming} upcoming screenings; ` +
        'consider swapping canonical and duplicate',
    );
  }
  const res = await client.query(
    `UPDATE cinemas SET "duplicateOfId" = $2
      WHERE id = $1 AND "duplicateOfId" IS DISTINCT FROM $2`,
    [duplicate.id, canonical.id],
  );
  if (res.rowCount) {
    // The canonical page and its city lose a duplicate: bump them so the
    // sitemap advertises the change.
    await client.query(`UPDATE cinemas SET "updatedAt" = now() WHERE id = $1`, [
      canonical.id,
    ]);
  }
  console.log(res.rowCount ? '  marked' : '  already marked');
};

const fixSkierniewice = async (client: Client): Promise<void> => {
  console.log('Skierniewice (operator CKiS vs venue Polonez):');
  const operator = await findOneInCity(
    client,
    'skierniewice',
    '%centrum kultury%',
  );
  const venue = await findOneInCity(client, 'skierniewice', '%polonez%');
  if (!operator || !venue) {
    console.warn('  ! skipped');
    return;
  }
  await markDuplicate(client, operator, venue);
};

const applyMarks = async (
  client: Client,
  marks: DuplicateMark[],
): Promise<void> => {
  for (const { duplicateSlug, canonicalSlug } of marks) {
    console.log(`--mark ${duplicateSlug}=${canonicalSlug}:`);
    const duplicate = await findBySlug(client, duplicateSlug);
    const canonical = await findBySlug(client, canonicalSlug);
    if (!duplicate || !canonical) {
      console.warn(
        `  ! unknown slug: ${!duplicate ? duplicateSlug : canonicalSlug}`,
      );
      continue;
    }
    await markDuplicate(client, duplicate, canonical);
  }
};

const listDuplicates = async (client: Client): Promise<void> => {
  // Street normalised: lowercase, no "ul./al./pl./os." prefix, letters and
  // digits only, so "ul. Bieszczadzka 1" and "Bieszczadzka 1" match.
  const res = await client.query<{
    city: string;
    a: string;
    b: string;
    distance: number | null;
    sameStreet: boolean;
  }>(
    `WITH c AS (
       SELECT c.*,
              regexp_replace(
                regexp_replace(lower(coalesce(c.street, '')),
                               '^\\s*(ul|al|pl|os)\\.?\\s+', ''),
                '[^0-9a-ząćęłńóśźż]', '', 'g') AS norm,
              (SELECT count(*)::int FROM screenings s
                WHERE s."cinemaId" = c."sourceId" AND s.date >= now()) AS upcoming
         FROM cinemas c
     ),
     pairs AS (
       SELECT a.*, b.slug AS b_slug, b.name AS b_name, b.street AS b_street,
              b.upcoming AS b_upcoming, b."duplicateOfId" AS b_dup,
              a.norm <> '' AND a.norm = b.norm AS same_street,
              CASE WHEN a.latitude IS NOT NULL AND b.latitude IS NOT NULL THEN
                6371000 * sqrt(
                  power(radians(b.latitude - a.latitude), 2) +
                  power(cos(radians((a.latitude + b.latitude) / 2))
                        * radians(b.longitude - a.longitude), 2))
              END AS distance
         FROM c a
         JOIN c b ON b."sourceCityId" = a."sourceCityId" AND b.id > a.id
     )
     SELECT ci.name AS city,
            format('%s [%s] %s, upcoming %s%s', p.name, p.slug,
                   coalesce(p.street, '-'), p.upcoming,
                   CASE WHEN p."duplicateOfId" IS NOT NULL
                        THEN ', already a duplicate' ELSE '' END) AS a,
            format('%s [%s] %s, upcoming %s%s', p.b_name, p.b_slug,
                   coalesce(p.b_street, '-'), p.b_upcoming,
                   CASE WHEN p.b_dup IS NOT NULL
                        THEN ', already a duplicate' ELSE '' END) AS b,
            round(p.distance::numeric)::int AS distance,
            p.same_street AS "sameStreet"
       FROM pairs p
       JOIN cities ci ON ci."sourceId" = p."sourceCityId"
      WHERE p.same_street OR p.distance < $1
      ORDER BY ci.name, p.distance NULLS LAST`,
    [DUPLICATE_DISTANCE_M],
  );

  console.log(
    `${res.rows.length} likely operator/venue duplicate pairs ` +
      `(same city, same street or < ${DUPLICATE_DISTANCE_M} m apart):`,
  );
  for (const r of res.rows) {
    const why = [
      r.sameStreet ? 'same street' : null,
      r.distance !== null ? `${r.distance} m` : null,
    ]
      .filter(Boolean)
      .join(', ');
    console.log(`\n${r.city} (${why})\n  ${r.a}\n  ${r.b}`);
  }
};

const parseMarks = (): DuplicateMark[] => {
  const marks: DuplicateMark[] = [];
  process.argv.forEach((arg, i) => {
    if (arg !== '--mark') return;
    const [duplicateSlug, canonicalSlug] = (process.argv[i + 1] ?? '').split(
      '=',
    );
    if (!duplicateSlug || !canonicalSlug) {
      console.error('--mark expects <duplicate-slug>=<canonical-slug>');
      process.exit(1);
    }
    marks.push({ duplicateSlug, canonicalSlug });
  });
  return marks;
};

const run = async () => {
  const client = new Client(process.env.DATABASE_URL);
  await client.connect();
  try {
    if (process.argv.includes('--list-duplicates')) {
      await listDuplicates(client);
      return;
    }

    const commit = process.argv.includes('--commit');
    const marks = parseMarks();
    await client.query('BEGIN');
    try {
      await fixArtKinoKrosno(client);
      await fixSkierniewice(client);
      await applyMarks(client, marks);
      await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    console.log(
      commit
        ? '\nCommitted.'
        : '\n[dry-run] rolled back; pass --commit to apply.',
    );
  } finally {
    await client.end();
  }
};

run().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});
