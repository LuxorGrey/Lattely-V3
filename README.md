# Lattely

A community ranking of specialty coffee shops in Barcelona. See [CONTEXT.md](CONTEXT.md) for the domain language.

## Getting started

You need Node, pnpm and Docker (we use [OrbStack](https://orbstack.dev) on macOS). Make sure OrbStack is running.

```bash
pnpm install
docker compose up -d   # Postgres + PostGIS on localhost:5433
pnpm db:migrate        # create the tables in the dev database
pnpm db:seed           # add a few sample Shops
pnpm dev               # http://localhost:3000
```

After a restart, run `docker compose up -d` again before `pnpm dev`. The data is kept until you run `docker compose down`.

## Scripts

| Command            | What it does                                                                  |
| ------------------ | ----------------------------------------------------------------------------- |
| `pnpm dev`         | Run the app, using the dev database `lattely` (URL in `.env.development`)     |
| `pnpm test`        | Start Docker if needed, rebuild the empty `lattely_test` database, run Vitest |
| `pnpm typecheck`   | Check TypeScript                                                              |
| `pnpm lint`        | Run ESLint                                                                    |
| `pnpm format`      | Format all files with Prettier                                                |
| `pnpm db:generate` | Write a new migration after changing `db/schema.ts`                           |
| `pnpm db:migrate`  | Apply new migrations to the database in `DATABASE_URL` (dev by default)       |
| `pnpm db:seed`     | Add the sample Shops to the dev database (safe to run again)                  |

## Neon (deployed databases)

The deployed app uses the Neon project `Lattely-V3` (Frankfurt), which has two branches: `production` for the live site and `development` for Vercel previews. Local dev and tests never touch Neon.

After adding a migration, apply it to both branches, `production` before pushing the code that needs it:

```bash
pnpm db:migrate:neon-development
pnpm db:migrate:neon-production
```

These ask the `neon` CLI (logged in to your account) for the branch's address and set it as `DATABASE_URL`, which wins over `.env.development`. No Neon password is stored in the repo.

The same trick runs the seed on either branch: `DATABASE_URL="$(neon connection-string production --project-id silent-forest-50770475)" pnpm db:seed`. On Neon it only adds the real Shops; sample Ratings go into a `localhost` database only.
