# Contributing to Klaps Backend

Thanks for your interest in contributing! This document outlines the process for contributing to this project.

## Prerequisites

- [Node.js 20+](https://nodejs.org)
- [Yarn](https://yarnpkg.com)
- [MySQL 8](https://www.mysql.com)

## Getting Started

1. Fork the repository
2. Clone your fork:

```bash
git clone https://github.com/klaps-hq/api.klaps.space.git
cd klaps-nest-backend
```

3. Install dependencies:

```bash
yarn install
```

4. Create a `.env` file (see [README](README.md#environment-variables))

5. Run the dev server:

```bash
yarn start:dev
```

## Branching Strategy

| Branch | Purpose               |
| ------ | --------------------- |
| `main` | Production releases   |
| `dev`  | Development / staging |

- Create feature branches from `dev`
- Use descriptive branch names: `feat/add-cinema-search`, `fix/screening-date-offset`, `refactor/movies-service`

## Making Changes

1. Create a new branch from `dev`:

```bash
git checkout dev
git pull origin dev
git checkout -b feat/your-feature
```

2. Make your changes
3. Ensure code quality:

```bash
yarn lint        # ESLint
yarn test        # Unit tests
yarn test:e2e    # E2E tests
```

4. Commit with a clear message:

```bash
git commit -m "feat: add cinema search by name"
```

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org):

| Prefix      | Usage                            |
| ----------- | -------------------------------- |
| `feat:`     | New feature                      |
| `fix:`      | Bug fix                          |
| `refactor:` | Code change (no new feature/fix) |
| `test:`     | Adding or updating tests         |
| `docs:`     | Documentation only               |
| `chore:`    | Build, CI, tooling changes       |

## Pull Requests

1. Push your branch and open a PR against `dev`
2. Fill in the PR description: what changed and why
3. Ensure CI passes (lint + tests)
4. Request a review

## Code Style

- TypeScript strict mode
- ESLint + Prettier (run `yarn lint` to auto-fix)
- Use `class-validator` decorators for DTOs
- Use early returns for readability
- Descriptive variable/function names

## Database Changes

If your change modifies the schema:

1. Update the schema file in `src/database/schemas/`
2. Generate a migration: `yarn db:generate`
3. Commit the generated migration file alongside the schema change

## Questions?

Open an issue or start a discussion on the repository.
