<p align="center">
  <img src="klaps-backend-og.png" alt="Klaps Backend" width="800" />
</p>

<h1 align="center">Klaps Backend</h1>

<p align="center">
  <em>REST API powering Klaps — the Polish nationwide guide to special screenings, classic cinema, and retrospectives.</em>
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> ·
  <a href="#project-structure">Project Structure</a> ·
  <a href="#deployment">Deployment</a>
</p>

---

Klaps Backend is the NestJS REST API that serves the [Klaps](https://klaps.space) frontend. It manages movies, cinemas, cities, genres, screenings, and showtimes — all ingested by an external scrapper and exposed through a versioned API behind rate limiting and API key authentication.

## Tech Stack

| Layer           | Technology                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | [NestJS 11](https://nestjs.com) (Express)                                                                                                     |
| Language        | [TypeScript 5](https://www.typescriptlang.org)                                                                                                |
| ORM             | [Drizzle ORM](https://orm.drizzle.team) (MySQL dialect)                                                                                       |
| Database        | [MySQL 8](https://www.mysql.com) via `mysql2`                                                                                                 |
| Validation      | [class-validator](https://github.com/typestack/class-validator) + class-transformer                                                           |
| Auth            | API key guard (`x-internal-api-key` header)                                                                                                   |
| Rate Limiting   | [@nestjs/throttler](https://docs.nestjs.com/security/rate-limiting) (30/10s, 100/60s)                                                         |
| Caching         | [@nestjs/cache-manager](https://docs.nestjs.com/techniques/caching)                                                                           |
| Logging         | [nestjs-pino](https://github.com/iamolegga/nestjs-pino) (structured JSON)                                                                     |
| Health Checks   | [@nestjs/terminus](https://docs.nestjs.com/recipes/terminus)                                                                                  |
| Security        | [Helmet](https://helmetjs.github.io)                                                                                                          |
| Testing         | [Jest](https://jestjs.io) + [@nestjs/testing](https://docs.nestjs.com/fundamentals/testing) + [Supertest](https://github.com/ladjs/supertest) |
| Package Manager | [Bun](https://bun.sh)                                                                                                                         |
| Runtime         | [Node.js 22](https://nodejs.org) (LTS)                                                                                                        |
| Deployment      | Docker (multi-stage Alpine) via GitHub Actions to GHCR                                                                                        |

## Architecture

```
Request ──► Helmet ──► CORS ──► ThrottlerGuard ──► Controller ──► Service ──► Drizzle ──► MySQL
                                     │
                        InternalBypassThrottlerGuard
                     (skips limit for internal key)
```

- **Global prefix:** `/api/v2`
- **Global guard:** `InternalBypassThrottlerGuard` — rate limits public traffic, skips for requests with valid `x-internal-api-key`
- **Per-route guard:** `InternalApiKeyGuard` — restricts write endpoints (POST) and some reads to the internal scrapper
- **Validation pipe:** `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`

## Project Structure

```
src/
├── cinemas/                # Cinemas module (controller, service, repository, DTOs)
├── cities/                 # Cities module
├── database/               # Drizzle setup, schemas, migrations
│   ├── schemas/            # Table definitions & relations
│   ├── migrations/         # Generated SQL migrations
│   └── constants.ts        # DRIZZLE injection token
├── genres/                 # Genres module
├── guards/                 # InternalApiKeyGuard, InternalBypassThrottlerGuard
├── health/                 # Health check (Terminus + Drizzle indicator)
├── lib/                    # Utilities (pagination, slugs, dates, batch helpers, deadlock retry)
├── logger/                 # Pino logger module
├── movies/                 # Movies module
├── screenings/             # Screenings module
├── showtimes/              # Showtimes module (ingestion pipeline)
├── socials/                # Socials module (candidate scoring & post tracking)
├── scripts/                # DB scripts (baseline, wipe, slug backfill)
├── app.module.ts           # Root module
└── main.ts                 # Bootstrap (port, CORS, Helmet, pipes)
test/
├── app.e2e-spec.ts         # E2E health check test
└── jest-e2e.json           # E2E Jest config
```

## API Endpoints

All routes are prefixed with `/api/v2`. All endpoints require the `x-internal-api-key` header (except `/health`).

### Health

| Method | Route     | Description       |
| ------ | --------- | ----------------- |
| GET    | `/health` | Health check (DB) |

### Cities

| Method | Route                 | Params / Body              | Description                    |
| ------ | --------------------- | -------------------------- | ------------------------------ |
| GET    | `/cities`             | —                          | List all cities                |
| GET    | `/cities/scraped`     | `?dateFrom`, `?dateTo`, `?cityId`, `?citySlug` | Scraped city IDs in date range |
| GET    | `/cities/with-cinemas`| —                          | Cities with cinema count       |
| GET    | `/cities/:slug`       | `:slug`                    | City detail + screenings       |
| POST   | `/cities/batch`       | `CreateCitiesBatchDto`     | Batch upsert cities            |
| POST   | `/cities/:slug`       | `UpdateCityDto`            | Update city by slug            |

### Cinemas

| Method | Route             | Params / Body           | Description             |
| ------ | ----------------- | ----------------------- | ----------------------- |
| GET    | `/cinemas`        | `?cityId`, `?citySlug`  | List cinemas            |
| GET    | `/cinemas/:slug`  | `:slug`                 | Cinema detail with city |
| POST   | `/cinemas/batch`  | `CreateCinemasBatchDto` | Batch upsert cinemas    |
| POST   | `/cinemas/:slug`  | `UpdateCinemaDto`       | Update cinema by slug   |

### Genres

| Method | Route            | Params / Body    | Description         |
| ------ | ---------------- | ---------------- | ------------------- |
| GET    | `/genres`        | —                | List all genres     |
| GET    | `/genres/:slug`  | `:slug`          | Genre detail        |
| POST   | `/genres/:slug`  | `UpdateGenreDto` | Update genre by slug|

### Movies

| Method | Route                | Params / Body                              | Description                                       |
| ------ | -------------------- | ------------------------------------------ | ------------------------------------------------- |
| GET    | `/movies`            | `?search`, `?genreId`, `?genreSlug`, `?page`, `?limit` | Paginated movie list                 |
| GET    | `/movies/multi-city` | `?limit` (1-50)                            | Movies screened in the most cities (cached 15min)  |
| GET    | `/movies/:slug`      | `:slug`                                    | Full movie detail with relations                   |
| POST   | `/movies/batch`      | `CreateMoviesBatchDto`                     | Batch upsert movies with relations                 |

### Screenings

| Method | Route                          | Params / Body                                                                                    | Description                    |
| ------ | ------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------ |
| GET    | `/screenings`                  | `?dateFrom`, `?dateTo`, `?movieId`, `?cityId`, `?citySlug`, `?genreId`, `?genreSlug`, `?cinemaSlug`, `?search` | Screenings (grouped by movie) |
| GET    | `/screenings/random-screening` | —                                                                                                | Random retro screening         |
| POST   | `/screenings`                  | `CreateScreeningDto`                                                                             | Create screening               |

### Showtimes

| Method | Route              | Params / Body                              | Description        |
| ------ | ------------------ | ------------------------------------------ | ------------------ |
| GET    | `/showtimes`       | `?dateFrom`, `?dateTo`, `?cityId`, `?citySlug` | List showtimes |
| POST   | `/showtimes/batch` | `CreateShowtimesBatchDto`                  | Batch upsert       |

### Socials

| Method | Route               | Params / Body                                                  | Description              |
| ------ | ------------------- | -------------------------------------------------------------- | ------------------------ |
| GET    | `/socials/candidate` | `?dateFrom`, `?dateTo`, `?minScore`, `?numberOfCandidates`, `?platform` | Get scored candidate |
| POST   | `/socials/reserve`   | `SocialsActionDto` (`platform`, `screeningId`)                | Reserve candidate        |
| POST   | `/socials/publish`   | `SocialsActionDto` (`platform`, `screeningId`)                | Publish candidate        |

## Getting Started

### Prerequisites

- [Node.js 22+](https://nodejs.org)
- [Bun](https://bun.sh)
- [MySQL 8](https://www.mysql.com) (or a compatible server)

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
DATABASE_URL=mysql://user:password@localhost:3306/klaps_dev
INTERNAL_API_KEY=your-secret-api-key
FRONTEND_URL=http://localhost:3000
```

| Variable           | Required | Description                                                        |
| ------------------ | -------- | ------------------------------------------------------------------ |
| `PORT`             | No       | Server port (default: `5000`)                                      |
| `DATABASE_URL`     | Yes      | MySQL connection string                                            |
| `INTERNAL_API_KEY` | Yes      | API key for authenticating internal/scrapper requests              |
| `FRONTEND_URL`     | No       | Allowed CORS origin for the frontend                               |
| `LOG_LEVEL`        | No       | Pino log level: `debug`, `info`, `warn`, `error` (default: `debug` dev / `info` prod) |
| `LOG_FILE`         | No       | Path to additional log file output; if unset, logs go to stdout only |

### Install & Run

```bash
# Install dependencies
bun install

# Generate Drizzle migrations (if schema changed)
bun run db:generate

# Run migrations
bun run db:migrate

# Start in development (watch mode)
bun run start:dev

# Build for production
bun run build

# Start production
bun run start:prod

# Lint
bun run lint

# Unit tests
bun run test

# E2E tests
bun run test:e2e

# Test coverage
bun run test:cov
```

The API will be available at [http://localhost:5000/api/v2](http://localhost:5000/api/v2).

## Docker

### Build

```bash
docker build -t klaps-backend .
```

### Run

```bash
docker run -p 5000:5000 \
  -e DATABASE_URL=mysql://user:pass@host:3306/klaps \
  -e INTERNAL_API_KEY=your-key \
  -e FRONTEND_URL=https://klaps.space \
  klaps-backend
```

### Docker Compose

The included `docker-compose.yml` is configured for deployment behind [Traefik](https://traefik.io) reverse proxy with automatic HTTPS and a built-in healthcheck:

```bash
docker compose up -d
```

The compose file expects a `.env` file and an external `proxy` network for Traefik.

## Deployment

The project uses **GitHub Actions** for CI/CD (`.github/workflows/deploy.yml`):

| Branch | Environment | Image Tag |
| ------ | ----------- | --------- |
| `main` | Production  | `latest`  |
| `dev`  | Development | `dev`     |

**Pipeline steps:**

1. **Lint & Test** — ESLint + Jest unit tests (gates the build)
2. **Build & Push** — Docker image to GitHub Container Registry
3. **DB Backup** — `mysqldump` via SSH before migration
4. **DB Migrate** — Drizzle baseline + migrations
5. **Deploy** — SCP compose file, pull image, recreate container

**Required GitHub Secrets:**

| Secret             | Description                                    |
| ------------------ | ---------------------------------------------- |
| `IMAGE_NAME`       | GHCR image (e.g. `ghcr.io/user/klaps-backend`) |
| `DATABASE_URL`     | MySQL connection string                        |
| `INTERNAL_API_KEY` | API authentication key                         |
| `SERVER_IP`        | Deployment server IP                           |
| `SERVER_USER`      | SSH user                                       |
| `SERVER_SSH_KEY`   | SSH private key                                |
| `PROJECT_DIR`      | Remote project root path                       |
| `PORT`             | Application port                               |
| `DOMAIN`           | Domain for Traefik routing                     |
| `GHCR_PAT`         | GitHub Container Registry token                |

## Open Source

Klaps is an open-source project. The source code is publicly available on GitHub:

| Component              | Repository                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------- |
| **Frontend** (Next.js) | [github.com/klaps-hq/klaps](https://github.com/klaps-hq/klaps.space)                   |
| **Backend** (NestJS)   | [github.com/klaps-hq/api.klaps.space](https://github.com/klaps-hq/api.klaps.space)     |

> The scrapper responsible for collecting screening data is not publicly available for legal reasons.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## License

This project is licensed under the [MIT License](LICENSE).
