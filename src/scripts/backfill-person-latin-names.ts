/**
 * Replaces person names stored in their original script ("宮崎駿",
 * "عباس کیارستمی", "Андрей Тарковский") with a Latin-script name from TMDB,
 * and gives directors whose slug is the `rezyser-<sourceId>` placeholder a
 * readable slug built from that name.
 *
 * Why: the scraper takes names from TMDB credits fetched with pl-PL, and
 * TMDB answers in the original script when it has no Polish entry for the
 * person. Directors with such names got the `rezyser-<sourceId>` fallback
 * slug, which also stayed frozen after a later scrape brought a Latin name
 * (Kiichi Kumagai is still `rezyser-1255809`).
 *
 * Name source, first Latin-script candidate wins (lib/latin-name.ts):
 *   1. the stored name, when it already is Latin (slug-only fix),
 *   2. TMDB /person/{id}?language=pl-PL `name`,
 *   3. TMDB /person/{id}?language=en-US `name`,
 *   4. TMDB `also_known_as`, in TMDB's order.
 * Rows with no Latin candidate are reported and left alone.
 *
 * Slugs: only directors whose slug is exactly `rezyser-<their sourceId>`
 * get a new one, so no readable URL ever changes. The old placeholder keeps
 * resolving: GET /directors/rezyser-<sourceId> falls back to the TMDB id
 * (DirectorsRepository.findBySlug) and the frontend 301s to the new slug.
 * Changed directors get `updatedAt = now()` so the sitemap lastmod moves.
 * The scraper upsert no longer overwrites a Latin name with a non-Latin one
 * (keepLatinNameSql), so the fix survives the next scrape.
 *
 * Dry run by default: everything runs inside a transaction that is rolled
 * back, and the planned changes are printed. Pass --commit to write.
 *
 * Auth (set one in .env):
 *   TMDB_READ_TOKEN  - v4 read access token (sent as Bearer), preferred
 *   TMDB_API_KEY     - v3 API key (sent as ?api_key=)
 *
 * Usage:
 *   bunx ts-node -r dotenv/config src/scripts/backfill-person-latin-names.ts [--commit]
 */
import 'dotenv/config';
import { Client, type QueryResultRow } from 'pg';
import { isLatinName, pickLatinName } from '../lib/latin-name';
import { directorSlug, uniqueSlug } from '../lib/slug';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const CONCURRENCY = 8;
const PERSON_TABLES = ['directors', 'scriptwriters', 'actors'] as const;
type PersonTable = (typeof PERSON_TABLES)[number];

const readToken = process.env.TMDB_READ_TOKEN;
const apiKey = process.env.TMDB_API_KEY;

type TmdbPerson = { name?: string; also_known_as?: string[] };

const fetchPerson = async (
  sourceId: number,
  language: string,
): Promise<TmdbPerson | null> => {
  const params = new URLSearchParams({ language });
  if (!readToken && apiKey) params.set('api_key', apiKey);
  const res = await fetch(
    `${TMDB_BASE}/person/${sourceId}?${params.toString()}`,
    { headers: readToken ? { Authorization: `Bearer ${readToken}` } : {} },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TMDB ${res.status} for person ${sourceId}`);
  return (await res.json()) as TmdbPerson;
};

// The same TMDB person can be a director, a screenwriter and an actor.
const latinNameCache = new Map<number, Promise<string | null>>();

const resolveLatinName = (sourceId: number): Promise<string | null> => {
  let pending = latinNameCache.get(sourceId);
  if (!pending) {
    pending = (async () => {
      const pl = await fetchPerson(sourceId, 'pl-PL');
      if (pl?.name && isLatinName(pl.name)) return pl.name.trim();
      const en = await fetchPerson(sourceId, 'en-US');
      return pickLatinName([en?.name, ...(en?.also_known_as ?? [])]);
    })();
    latinNameCache.set(sourceId, pending);
  }
  return pending;
};

const isPlaceholderSlug = (slug: unknown, sourceId: number): boolean =>
  slug === `rezyser-${sourceId}`;

type PlannedChange = {
  table: PersonTable;
  id: number;
  sourceId: number;
  oldName: string;
  newName: string;
  oldSlug?: string;
  newSlug?: string;
};

const run = async (commit: boolean) => {
  if (!readToken && !apiKey) {
    throw new Error(
      'Set TMDB_READ_TOKEN (v4 bearer) or TMDB_API_KEY (v3) in .env',
    );
  }

  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  try {
    await client.query('BEGIN');

    const { rows: slugRows } = await client.query<QueryResultRow>(
      `SELECT slug FROM directors WHERE slug IS NOT NULL`,
    );
    const takenSlugs = new Set<string>(slugRows.map((r) => r.slug as string));

    const changes: PlannedChange[] = [];
    const unresolved: { table: PersonTable; sourceId: number; name: string }[] =
      [];
    let failed = 0;

    for (const table of PERSON_TABLES) {
      // A cheap SQL prefilter (no ASCII letter), refined with the exact
      // script check below; directors also need their placeholder slugs.
      const { rows } = await client.query<QueryResultRow>(
        table === 'directors'
          ? `SELECT id, "sourceId", name, slug FROM directors
             WHERE name !~ '[A-Za-z]' OR slug ~ '^rezyser-[0-9]+$' ORDER BY id`
          : `SELECT id, "sourceId", name FROM ${table}
             WHERE name !~ '[A-Za-z]' ORDER BY id`,
      );
      console.log(`${table}: ${rows.length} candidate row(s)`);

      for (let i = 0; i < rows.length; i += CONCURRENCY) {
        const batch = rows.slice(i, i + CONCURRENCY);
        const resolved = await Promise.all(
          batch.map(async (row) => {
            const name = row.name as string;
            const sourceId = row.sourceId as number;
            if (isLatinName(name)) return { row, latin: name.trim() };
            try {
              return { row, latin: await resolveLatinName(sourceId) };
            } catch (err) {
              failed++;
              console.warn(
                `  ${table} ${sourceId} failed: ${err instanceof Error ? err.message : String(err)}`,
              );
              return { row, latin: null };
            }
          }),
        );

        // Sequential from here: slug uniqueness depends on earlier rows.
        for (const { row, latin } of resolved) {
          const id = row.id as number;
          const sourceId = row.sourceId as number;
          const oldName = row.name as string;
          if (!latin) {
            unresolved.push({ table, sourceId, name: oldName });
            continue;
          }

          const change: PlannedChange = {
            table,
            id,
            sourceId,
            oldName,
            newName: latin,
          };

          if (table === 'directors' && isPlaceholderSlug(row.slug, sourceId)) {
            const base = directorSlug(latin, sourceId);
            if (!isPlaceholderSlug(base, sourceId)) {
              takenSlugs.delete(row.slug as string);
              change.oldSlug = row.slug as string;
              change.newSlug = uniqueSlug(base, takenSlugs);
              takenSlugs.add(change.newSlug);
            }
          }

          if (change.newName === oldName && !change.newSlug) continue;
          changes.push(change);

          if (table === 'directors') {
            await client.query(
              `UPDATE directors SET name = $1, slug = COALESCE($2, slug), "updatedAt" = now() WHERE id = $3`,
              [change.newName, change.newSlug ?? null, id],
            );
          } else {
            await client.query(`UPDATE ${table} SET name = $1 WHERE id = $2`, [
              change.newName,
              id,
            ]);
          }
        }
      }
    }

    await client.query(commit ? 'COMMIT' : 'ROLLBACK');

    for (const c of changes) {
      const slugPart = c.newSlug ? `  slug ${c.oldSlug} -> ${c.newSlug}` : '';
      console.log(
        `  ${c.table} #${c.id} (tmdb ${c.sourceId}): "${c.oldName}" -> "${c.newName}"${slugPart}`,
      );
    }
    for (const u of unresolved) {
      console.log(`  unresolved ${u.table} (tmdb ${u.sourceId}): "${u.name}"`);
    }
    const slugCount = changes.filter((c) => c.newSlug).length;
    console.log(
      `${commit ? 'Updated' : '[dry-run] would update'} ${changes.length} row(s), ` +
        `${slugCount} director slug(s); ${unresolved.length} without a Latin name, ` +
        `${failed} TMDB failure(s).`,
    );
    if (!commit) console.log('Nothing written. Re-run with --commit to apply.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    await client.end();
  }
};

run(process.argv.includes('--commit')).catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
