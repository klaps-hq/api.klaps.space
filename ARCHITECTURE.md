# Architecture Guide — api.klaps.space

Instrukcje tworzenia folderow, plikow i funkcji w tym projekcie.

---

## Przepyw requestu

```
Client
  -> Controller    (HTTP, walidacja DTO, guards)
  -> Service       (orkiestracja, mapowanie response)
  -> Repository    (queries do bazy)
  -> Database      (Drizzle ORM + MySQL)
```

---

## Struktura projektu

```
src/
  app.module.ts                     # root module
  main.ts                           # bootstrap

  database/                         # @Global() Drizzle module
    constants.ts                    # DRIZZLE injection token
    database.module.ts
    schemas/
      {table}.schema.ts             # definicja tabeli
      relations.ts                  # relacje Drizzle
      index.ts                      # re-export wszystkich tabel

  lib/                              # wspoldzielone utilities
    date.ts                         # Europe/Warsaw timezone helpers
    slug.ts                         # toSlug, movieSlug, uniqueSlug
    paginate.ts                     # paginacja
    response-types.ts               # typy response API
    response-mappers.ts             # schema -> response mappers

  wrappers/                         # DB operation helpers
    chunked-upsert.ts              # sortAndChunk(values, sortKey)
    with-deadlock-retry.ts         # withDeadlockRetry(fn, { label })

  guards/                           # NestJS guards
    internal-api-key.guard.ts       # x-internal-api-key header
    internal-bypass-throttler.guard.ts  # APP_GUARD, skip throttle

  {domain}/                         # feature modules (ponizej)
```

---

## Anatomia modulu

Projekt ma dwa poziomy zlozonosci modulow:

### Prosty modul (cinemas, cities, genres, screenings, showtimes, socials)

```
{domain}/
  {domain}.module.ts
  {domain}.controller.ts
  {domain}.service.ts               # queries + logika w jednym pliku
  {domain}.types.ts                 # opcjonalnie, typy parametrow
  dto/
    get-{domain}-query.dto.ts
    create-{domain}-batch.dto.ts
    update-{domain}.dto.ts
```

Service robi wszystko: read, write, mapowanie.
Stosuj gdy modul jest maly (< 150 linii service).

### Zlozony modul (movies — wzorzec docelowy)

```
{domain}/
  {domain}.module.ts
  {domain}.controller.ts
  {domain}.service.ts               # orkiestracja (< 50 linii)
  {domain}.repository.ts            # wszystkie queries do bazy
  {domain}-batch.service.ts         # batch upsert + relacje
  {domain}.types.ts
  dto/
    get-{domain}-query.dto.ts
    create-{domain}-batch.dto.ts
```

Stosuj gdy:
- service przekracza ~150 linii
- modul ma batch operacje z junction tables
- logika read i write jest wystarczajaco rozna

---

## Nazewnictwo plikow

| Plik | Konwencja | Przyklad |
|------|-----------|----------|
| Module | `{domain}.module.ts` | `movies.module.ts` |
| Controller | `{domain}.controller.ts` | `movies.controller.ts` |
| Service | `{domain}.service.ts` | `movies.service.ts` |
| Repository | `{domain}.repository.ts` | `movies.repository.ts` |
| Batch service | `{domain}-batch.service.ts` | `movies-batch.service.ts` |
| Types | `{domain}.types.ts` | `movies.types.ts` |
| Constants | `{domain}.constants.ts` | `socials.constants.ts` |
| Schema | `{table}.schema.ts` | `movies.schema.ts` |
| Junction schema | `{table_a}_{table_b}.schema.ts` | `movies_actors.schema.ts` |
| Get query DTO | `get-{resource}-query.dto.ts` | `get-movies-query.dto.ts` |
| Create batch DTO | `create-{domain}-batch.dto.ts` | `create-movies-batch.dto.ts` |
| Update DTO | `update-{domain}.dto.ts` | `update-cinema.dto.ts` |

---

## Module (NestJS)

```ts
@Module({
  imports: [CacheModule.register()],          // opcjonalnie
  controllers: [MoviesController],
  providers: [MoviesService, MoviesRepository, MoviesBatchService],
  exports: [MoviesService],                   // eksportuj tylko service
})
export class MoviesModule {}
```

Zasady:
- `exports` — tylko service, nigdy repository/batch bezposrednio
- Prosty modul ma tylko `[Service]` w providers
- Zlozony modul ma `[Service, Repository, BatchService]`

---

## Controller

```ts
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @UseGuards(InternalApiKeyGuard)
  getMovies(@Query() query: GetMoviesQueryDto): Promise<MovieSummaryResponse[]> {
    return this.moviesService.getMovies({ search: query.search });
  }

  @Post('batch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  createMoviesBatch(@Body() dto: CreateMoviesBatchDto): Promise<void> {
    return this.moviesService.createMoviesBatch(dto.movies);
  }

  @Get(':idOrSlug')
  @UseGuards(InternalApiKeyGuard)
  async getByIdOrSlug(@Param('idOrSlug') idOrSlug: string): Promise<MovieResponse> {
    const movie = await this.moviesService.getMovieByIdOrSlug(idOrSlug);
    if (!movie) throw new NotFoundException(`Movie "${idOrSlug}" not found`);
    return movie;
  }
}
```

Zasady:
- Controller NIGDY nie zawiera logiki biznesowej
- Write endpointy: `@Post('batch')` + `@HttpCode(HttpStatus.OK)`
- Guard `InternalApiKeyGuard` na write endpointach i admin reads
- Controller rozwija wrapper DTO: `dto.movies` -> service
- NotFoundException rzucany w controller, nie w service

---

## Service — orkiestracja (zlozony modul)

```ts
@Injectable()
export class MoviesService {
  constructor(
    private readonly repo: MoviesRepository,
    private readonly batchService: MoviesBatchService,
  ) {}

  async getMovies(params?: GetMoviesParams): Promise<MovieSummaryResponse[]> {
    const data = await this.repo.findMovies(params);
    return data.map(mapMovieSummary);
  }

  async getMovieByIdOrSlug(idOrSlug: string): Promise<MovieResponse | null> {
    const movie = await this.repo.findByIdOrSlug(idOrSlug);
    if (!movie) return null;
    return mapMovieDetail(movie);
  }

  async createMoviesBatch(movies: CreateMoviesBatchItemDto[]): Promise<void> {
    return this.batchService.createBatch(movies);
  }
}
```

Zasady:
- Service NIE importuje `@Inject(DRIZZLE)` — nie dotyka bazy
- Odpowiada za: mapowanie response, delegowanie do repo/batch, null check
- Mapery z `src/lib/response-mappers.ts`, nie inline

---

## Service — prosty modul (bez repository)

```ts
@Injectable()
export class CinemasService {
  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<FullSchema>,
  ) {}

  // === READ ===
  async getCinemas(query: GetCinemasQueryDto) { ... }
  async getCinemaByIdOrSlug(idOrSlug: string) { ... }

  // === WRITE ===
  async createCinemasBatch(cinemas: CreateCinemasBatchItemDto[]) { ... }
  async updateCinemaByIdOrSlug(idOrSlug: string, data: UpdateCinemaDto) { ... }
}
```

Sekcje oddzielone komentarzami `// === READ ===`, `// === WRITE ===`, `// === PRIVATE ===`.

---

## Repository

```ts
@Injectable()
export class MoviesRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<FullSchema>,
  ) {}

  // === READ ===
  async findMovies(params?: GetMoviesParams) { ... }
  async findByIdOrSlug(idOrSlug: string) { ... }
  async findMultiCityMovies(params?: GetMultiCityMoviesParams) { ... }

  // === WRITE ===
  async upsertBatch(movies: CreateMoviesBatchItemDto[]): Promise<void> { ... }
  async findIdsBySourceIds(sourceIds: number[]): Promise<Map<number, number>> { ... }

  // === PRIVATE ===
  private async findExistingSlugs(): Promise<Set<string>> { ... }
  private buildGenreCondition(genreId?: number, genreSlug?: string) { ... }
}
```

Zasady:
- Repository to jedyne miejsce z `@Inject(DRIZZLE)` (w zlozonym module)
- Nazwy metod read: `find*` (findMovies, findByIdOrSlug, findExistingSlugs)
- Nazwy metod write: `upsert*`, `update*`, `delete*`
- Zwraca surowe dane z bazy (bez mapowania na response types)
- Slug generation i condition builders sa private helpers w repo

---

## Batch Service

```ts
@Injectable()
export class MoviesBatchService {
  constructor(
    @Inject(DRIZZLE) private readonly db: MySql2Database<FullSchema>,
    private readonly moviesRepo: MoviesRepository,
  ) {}

  async createBatch(movies: CreateMoviesBatchItemDto[]): Promise<void> {
    if (movies.length === 0) return;

    await this.moviesRepo.upsertBatch(movies);

    const movieIdMap = await this.moviesRepo.findIdsBySourceIds(
      movies.map((m) => m.sourceId),
    );

    await Promise.all([
      this.upsertPersons(movies, movieIdMap, 'actors', 'movies_actors', 'actorId'),
      this.upsertPersons(movies, movieIdMap, 'directors', 'movies_directors', 'directorId'),
      this.upsertPersons(movies, movieIdMap, 'scriptwriters', 'movies_scriptwriters', 'scriptwriterId'),
      this.upsertCountries(movies, movieIdMap),
      this.upsertGenres(movies, movieIdMap),
    ]);
  }

  // private upsertPersons(...) { ... }
  // private upsertCountries(...) { ... }
  // private upsertGenres(...) { ... }
}
```

Zasady:
- Ma wlasny `@Inject(DRIZZLE)` bo operuje na junction tables (nie movies)
- Uzywa `moviesRepo` dla operacji na tabeli movies
- Relacje (junction tables) bezposrednio w batch service
- `Promise.all` dla niezaleznych relacji

---

## Batch upsert pattern

Kazdy batch insert w projekcie stosuje ten sam wzorzec:

```ts
// 1. sortAndChunk — sortuj po kluczu, podziel na chunki po 500
const chunks = sortAndChunk(values, (item) => item.sourceId);

// 2. withDeadlockRetry — exponential backoff na deadlocki MySQL
for (const chunk of chunks) {
  await withDeadlockRetry(
    () =>
      this.db
        .insert(schema.movies)
        .values(chunk)
        .onDuplicateKeyUpdate({
          set: {
            title: sql`VALUES(${schema.movies.title})`,
            // ... pola do updejtu
          },
        }),
    { label: 'createMoviesBatch:movies' },
  );
}
```

Zasady:
- Zawsze `sortAndChunk` przed insertem (redukuje gap-lock deadlocki)
- Zawsze `withDeadlockRetry` wokol insertu
- `onDuplicateKeyUpdate` z `sql\`VALUES()\`` pattern
- Label w formacie `{operacja}:{tabela}`
- BEZ explicit transactions (unikanie deadlockow)
- Chunk size domyslnie 500 (z `sortAndChunk`)

---

## DTO

### Batch DTO (write)

```ts
// Item DTO — walidacja pojedynczego elementu
export class CreateMoviesBatchItemDto {
  @Type(() => Number)
  @IsInt()
  sourceId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
  // ...
}

// Wrapper DTO — tablica elementow
export class CreateMoviesBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMoviesBatchItemDto)
  movies: CreateMoviesBatchItemDto[];
}
```

Konwencja nazw:
- Item: `Create{Domain}sBatchItemDto`
- Wrapper: `Create{Domain}sBatchDto`
- Pole w wrapper: nazwa domeny w plural (`movies`, `cinemas`, `cities`)

### Query DTO (read)

```ts
export class GetMoviesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  genreId?: number;
}
```

---

## Database schema

### Tabela

```ts
// src/database/schemas/movies.schema.ts
export const moviesTable = mysqlTable('movies', {
  id: int().primaryKey().autoincrement(),
  sourceId: int().notNull().unique(),                // external ID from scraper
  slug: varchar({ length: 255 }).notNull().unique(),
  title: varchar({ length: 255 }).notNull(),
  // ...
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type Movie = typeof moviesTable.$inferSelect;
export type NewMovie = typeof moviesTable.$inferInsert;
```

### Junction table

```ts
// src/database/schemas/movies_actors.schema.ts
export const moviesActorsTable = mysqlTable(
  'movies_actors',
  {
    id: int().primaryKey().autoincrement(),
    movieId: int().references(() => moviesTable.id).notNull(),
    actorId: int().references(() => actorsTable.id).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull().defaultNow(),
  },
  (table) => ({
    uniqueMovieActor: unique().on(table.movieId, table.actorId),
  }),
);
```

### Re-export w index.ts

```ts
// src/database/schemas/index.ts
export { moviesTable as movies } from './movies.schema';
export { moviesActorsTable as movies_actors } from './movies_actors.schema';
```

Alias = nazwa tabeli w SQL (snake_case).

### Relacje

Wszystkie relacje w jednym pliku: `src/database/schemas/relations.ts`.

---

## Response mapping

### Types w `src/lib/response-types.ts`

```ts
export type MovieSummaryResponse = {
  id: number;
  slug: string;
  title: string;
  // ... czyste pola bez sourceId, timestamps, itd.
};
```

### Mappers w `src/lib/response-mappers.ts`

```ts
export const mapMovieSummary = (movie: DbMovieWithGenres): MovieSummaryResponse => ({
  id: movie.id,
  slug: movie.slug,
  title: movie.title,
  genres: movie.movies_genres.map((mg) => mapGenre(mg.genre)),
  // ...
});
```

Zasady:
- Mapper przyjmuje DB row (z relations), zwraca response type
- Ukrywa: `sourceId`, `createdAt`, `updatedAt`, wewnetrzne FK
- Mapper NIGDY nie robi DB queries
- Uzywany w service, nie w controller/repository

---

## Types (`{domain}.types.ts`)

```ts
export type GetMoviesParams = {
  search?: string;
  genreId?: number;
  genreSlug?: string;
};
```

Sluzy do typowania parametrow wewnetrznych (service <-> repository).
Nie mylić z DTO (walidacja HTTP input).

---

## Drizzle injection

```ts
import { DRIZZLE } from '../database/constants';

type FullSchema = typeof schema & typeof relations;

constructor(
  @Inject(DRIZZLE) private readonly db: MySql2Database<FullSchema>,
) {}
```

- Token `DRIZZLE` z `src/database/constants.ts`
- Typ: `MySql2Database<FullSchema>` (schema + relations)
- `FullSchema` deklarowany lokalnie w kazdym pliku ktory uzywa DB

---

## Slug generation

```ts
import { toSlug, movieSlug, uniqueSlug } from '../lib/slug';

// Generic: "Kino Praha" -> "kino-praha"
const slug = toSlug(name);

// Movie-specific: "Aktorzy" + 2024 -> "aktorzy-2024"
const slug = movieSlug(title, productionYear);

// Unique: sprawdza Set istniejacych i dodaje -2, -3, itd.
const slug = uniqueSlug(baseSlug, takenSlugs);
```

Slug generation zawsze w repository (bo wymaga query po istniejace slugi).

---

## Kiedy tworzyc nowy modul

Nowy folder `src/{domain}/` gdy:
- Nowa tabela w bazie z wlasnymi endpointami
- Niezalezna domena biznesowa

NIE twórz osobnego modulu dla:
- Junction tables (obslugiwane przez batch service rodzica)
- Subentities bez wlasnych endpointow (actors, directors — obslugiwane przez movies batch)

---

## Kiedy rozdzielic service na repository + batch

Rozdziel gdy:
- Service > 150 linii
- Modul ma batch upsert z junction tables
- Read i write logika sa wystarczajaco rozne

Nie rozdzielaj gdy:
- Prosty CRUD (< 150 linii)
- Brak junction tables
- Modul jest stabilny i nie rosnie

---

## Checklist: nowy modul

1. `src/{domain}/{domain}.module.ts` — imports, controllers, providers, exports
2. `src/{domain}/{domain}.controller.ts` — routes + guards
3. `src/{domain}/{domain}.service.ts` — logika
4. `src/{domain}/dto/` — walidacja inputu
5. `src/database/schemas/{table}.schema.ts` — tabela
6. `src/database/schemas/index.ts` — dodaj re-export
7. `src/database/schemas/relations.ts` — dodaj relacje
8. `src/lib/response-types.ts` — dodaj response type
9. `src/lib/response-mappers.ts` — dodaj mapper
10. `src/app.module.ts` — zarejestruj modul w imports

## Checklist: rozdzielenie service na warstwy

1. Stworz `{domain}.repository.ts` — przenies wszystkie `this.db.*` queries
2. Stworz `{domain}-batch.service.ts` — przenies batch logike + junction tables
3. Przepisz `{domain}.service.ts` na orkiestracje (repo + batch + mapery)
4. Zaktualizuj `{domain}.module.ts` — dodaj providers
5. Eksportuj tylko service (nie repo/batch)
