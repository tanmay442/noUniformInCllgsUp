# UP Anonymous Protest Portal

Cloudflare-native anonymous voting portal scaffold based on the project docs.

## What is implemented

- Hono API worker (`src/worker.ts`) with routes:
  - `POST /api/vote`
  - `GET /api/tally`
  - `GET /api/leaderboard`
  - `GET /api/colleges`
  - `GET /healthz`
- D1 schema files:
  - `migrations/votes.sql`
  - `migrations/colleges.sql`
- Queue consumer for projection updates (`src/queue.ts`)
- Scheduled reconciliation job (`src/reconcile.ts`)
- Seed + canonical starter directory:
  - `data/colleges.json`
  - `seed/colleges.sql`

## Local setup

```bash
pnpm install
cp .dev.vars.example .dev.vars
```

Fill `.dev.vars`:
- `TURNSTILE_SECRET`
- `VOTE_TOKEN_PEPPER`

Set a real `TURNSTILE_SITE_KEY` in `wrangler.toml` for each environment before expecting production votes to verify.

## Cloudflare resource setup

```bash
pnpm exec wrangler whoami
pnpm exec wrangler d1 create votes_db
pnpm exec wrangler d1 create colleges_db
pnpm exec wrangler queues create vote-events
```

Then update IDs in `wrangler.toml`.

For environment separation, create separate resources too:

```bash
pnpm exec wrangler d1 create votes_db_staging
pnpm exec wrangler d1 create colleges_db_staging
pnpm exec wrangler d1 create votes_db_prod
pnpm exec wrangler d1 create colleges_db_prod
pnpm exec wrangler queues create vote-events-staging
pnpm exec wrangler queues create vote-events-prod
```

## Apply schema + seed

```bash
pnpm run db:apply:votes
pnpm run db:apply:colleges
pnpm run db:seed:colleges
```

## Secrets (required before real voting)

```bash
pnpm exec wrangler secret put TURNSTILE_SECRET
pnpm exec wrangler secret put VOTE_TOKEN_PEPPER
pnpm exec wrangler secret put TURNSTILE_SECRET --env staging
pnpm exec wrangler secret put VOTE_TOKEN_PEPPER --env staging
pnpm exec wrangler secret put TURNSTILE_SECRET --env production
pnpm exec wrangler secret put VOTE_TOKEN_PEPPER --env production
```

## Run

```bash
pnpm run dev
```

## Checks

```bash
pnpm run typecheck
pnpm test
```

## Notes

- Current college directory is starter data and should be replaced with the full canonical UP list before production.
- Turnstile secret and hash pepper must be set via `wrangler secret put` per environment.
