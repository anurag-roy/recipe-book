# Agent Guidelines

Full-stack TypeScript starting point for agent-led project setup.

## Setup

This repository provides a working structure, not a fixed set of infrastructure choices. When asked to create a project from this template, ask one concise round of questions before changing code. Skip anything the user has already answered:

- Project name, purpose, and package metadata
- Runtime: Node.js (default) or Bun
- Database: SQLite/libSQL (default), PostgreSQL, or MySQL; local or managed
- Deployment: one VPS/container serving the API and built client (default), or separate API and static client hosts
- Optional integrations: WebSockets, authentication, transactional email, object storage, queues, observability, or other project-specific services

Do not ask about replacing Hono, React, or their core stack: this template intentionally keeps Hono on the backend and React on the frontend. Do not add optional integrations unless selected by the user.

After the user answers, apply each choice end to end: dependencies, adapters, shared schemas, environment validation and `.env.example`, scripts, lockfiles, Docker configuration, tests, and README. Never invent credentials. Remove superseded dependencies and demo code that no longer fits, then run typecheck, lint, and build.

### Recipe: Bun

Replace Node.js with Bun when the user selects it during setup.

**Dependencies** — remove `tsx`, `@hono/node-server`, and `@types/node`. Add `@types/bun` (dev) in both root and `client/`. Regenerate lockfiles with Bun (see below).

**Lockfiles** — delete `package-lock.json` and `client/package-lock.json`. Run `bun install` at the repo root and `bun install --cwd client` to produce `bun.lock` and `client/bun.lock`.

**Scripts** (`package.json`) — use Bun throughout:

```json
"dev": "bun --env-file=.env --watch server/index.ts",
"dev:client": "bun run --cwd client dev",
"build": "bun server/scripts/build.ts",
"start": "bun --env-file=.env server/index.ts",
"db": "bunx drizzle-kit",
"db:seed": "bun --env-file=.env server/scripts/seed.ts",
"db:push": "bunx drizzle-kit push",
"db:studio": "bunx drizzle-kit studio",
"db:migrate": "bunx drizzle-kit migrate",
"db:generate": "bunx drizzle-kit generate"
```

**Server** — start with `Bun.serve` in `server/index.ts`:

```typescript
import app from '@server/app';
import { env } from '@server/lib/env';
import { logger } from '@server/lib/logger';

const server = Bun.serve({
  fetch: app.fetch,
  port: env.PORT,
});

logger.info(`Server starting on http://localhost:${server.port}`);
```

In `server/app.ts`, import `serveStatic` from `hono/bun` instead of `@hono/node-server/serve-static`.

**Build script** (`server/scripts/build.ts`) — use Bun's shell:

```typescript
import { $ } from 'bun';

await $`bun install`;
await $`bun install`.cwd('client');
await $`bun run build`.cwd('client');
```

**TypeScript** — set `"types": ["bun"]` in root `tsconfig.json` and `client/tsconfig.node.json`; set `"types": ["vite/client", "bun"]` in `client/tsconfig.app.json`.

**Docker** — use `oven/bun:1` for build and runner stages. Copy `bun.lock` files instead of npm lockfiles; install with `bun install --frozen-lockfile`. Build the client with `bun run --cwd client build`. Add `package-lock.json` and `client/package-lock.json` to `.dockerignore`.

**Entrypoint** (`docker-entrypoint.sh`):

```sh
bunx drizzle-kit push --force
exec bun server/index.ts
```

Update README and any editor rules to use `bun` instead of `npm`. Run `bun run typecheck`, `bun run lint`, and `bun run build`.

### Recipe: PostgreSQL

Replace SQLite/libSQL with PostgreSQL when the user selects it during setup. Drizzle v1 uses table-level `snakeCase` in `pg-core`; do not pass `schema` or `casing` to the Postgres `drizzle()` client (those options were removed from `DrizzlePgConfig`).

**Dependencies** — remove `@libsql/client`; add `pg` and `@types/pg` (dev). Regenerate the lockfile.

**Schema** (`server/db/schema.ts`) — switch imports from `drizzle-orm/sqlite-core` to `drizzle-orm/pg-core`. Map column types: `integer().primaryKey()` → `serial().primaryKey()`, `integer({ mode: 'boolean' })` → `boolean()`. Keep `snakeCase.table()` for column naming.

**Client** (`server/db/index.ts`) — use `drizzle-orm/node-postgres` with a `pg` `Pool`:

```typescript
import { env } from '@server/lib/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  max: 25,
  idleTimeoutMillis: 60_000,
  connectionString: env.DATABASE_URL,
});

export const db = drizzle({ client: pool });
export const closeDb = () => pool.end();

export type Transaction = Parameters<Parameters<(typeof db)['transaction']>[0]>[0];
```

**Drizzle Kit** (`drizzle.config.ts`) — set `dialect: 'postgresql'`. Keep `DATABASE_URL` in env validation and `.env.example` (e.g. `postgres://user:password@localhost:5432/dbname`).

**Docker** — remove SQLite-specific bits from `Dockerfile` (`.data` volume, `mkdir -p .data`, default `file:` URL). Add `docker-compose.yml` with a `postgres` service (expose `5432` for local dev, healthcheck, named volume) and an `app` service that sets `DATABASE_URL` to the internal hostname (`db`). The entrypoint can keep running `drizzle-kit push` on start.

Update README database and Docker sections. Run typecheck, lint, and build.

### Recipe: WebSockets

Define inbound and outbound message schemas in `server/shared/` and validate untrusted messages at runtime. Register `/api/ws` before the static-file catch-all.

For Node.js, use WebSocket support built into `@hono/node-server` plus `ws`; do not add the deprecated `@hono/node-ws` package:

```typescript
import { serve, upgradeWebSocket } from '@hono/node-server';
import { WebSocketServer } from 'ws';

app.get(
  '/api/ws',
  upgradeWebSocket(() => ({
    onMessage(event, ws) {
      ws.send(event.data);
    },
  }))
);

const wss = new WebSocketServer({ noServer: true });
serve({ fetch: app.fetch, port: env.PORT, websocket: { server: wss } });
```

For Bun, use its Hono adapter:

```typescript
import { upgradeWebSocket, websocket } from 'hono/bun';

app.get(
  '/api/ws',
  upgradeWebSocket(() => ({/* handlers */}))
);
Bun.serve({ fetch: app.fetch, port: env.PORT, websocket });
```

Add `client/src/hooks/use-websocket.ts` using the browser's native `WebSocket`. The hook should expose connection status, the latest validated message, `send`, and `close`; clean up on unmount; avoid stale callbacks; and use bounded reconnect backoff only when requested. Derive `ws:`/`wss:` from the configured API origin or accept `VITE_WS_URL`. Keep the Vite `/api` proxy configured with `ws: true`.

## Layout

| Path             | Purpose                                     |
| ---------------- | ------------------------------------------- |
| `client/`        | Frontend (Vite 8, React 19, React Compiler) |
| `server/`        | Backend (Hono with RPC type generation)     |
| `server/shared/` | Shared types and Zod schemas                |

## Stack

- **Runtime**: Node.js by default; Bun is supported by the setup recipe
- **Backend**: Hono, Drizzle ORM; SQLite/libSQL by default
- **Frontend**: Vite 8, React 19, Shadcn/ui (Base UI), TailwindCSS V4
- **Data**: TanStack Query (server state), TanStack Router (routing)
- **Validation**: Zod v4
- **Tooling**: Oxlint (`npm run lint`), Oxfmt (`npm run fmt`)

## General Practices

- Type-first: define types/schemas before implementation
- API-first: design contracts via Hono RPC for end-to-end type safety
- Validate all inputs with Zod; avoid `any` — use proper types or `unknown`
- Type all parameters and return values
- Error handling: error boundaries (client), `HTTPException` (server)
- Server logic in `server/`; client components in `client/src/components/`; routes in `server/routes/`

## Client

**Directories**: `client/src/components/ui/`, `client/src/routes/`, `client/src/lib/`

**Styling**: Use TailwindCSS V4 and shadcn/ui. Prefer theme variables from `client/src/index.css` (`foreground`, `background`, `primary`, etc.) over hardcoded colors.

**API**: Use the typed client in `client/src/lib/api.ts` with TanStack Query. Import shared types from `@shared/types`.

**Data fetching**:

- TanStack Query owns server-state caching; Router loaders only kick off fetches early
- Define shared `queryOptions` helpers; reuse in loaders and components
- `useSuspenseQuery` for required data; `useQuery` for optional/deferred data
- Treat loaders as prefetch handlers — don't return loader data or use `useLoaderData` with Query

```tsx
const dashboardQueryOptions = (dashboardId: string) =>
  queryOptions({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => fetchDashboard(dashboardId),
  });

// Loader
loader: ({ context, params }) => {
  context.queryClient.prefetchQuery(dashboardQueryOptions(params.dashboardId));
};

// Component
const { dashboardId } = Route.useParams();
const { data } = useSuspenseQuery(dashboardQueryOptions(dashboardId));
```

## Server

**Imports**: ES modules; `@server/` path alias; shared code from `@shared/types` and `@shared/schemas`

**Style**: `camelCase` variables/functions, `PascalCase` types, `kebab-case` files; prefer `async/await`

**Routes**: Chain handlers and export the router for Hono RPC inference:

```typescript
const authRouter = new Hono()
  .post('/login', routeValidator('json', loginSchema), async (c) => {
    /* ... */
  })
  .get('/me', protect, async (c) => {
    /* ... */
  });
export default authRouter;
```

**Database**: Use `db` from `@server/db/index.ts`; schema in `@server/db/schema.ts`

**Errors & config**: `@server/middlewares/validator` for validation, `HTTPException` for API errors, `@server/lib/logger` for logging, `@server/lib/env` for environment variables

## Cursor Cloud specific instructions

Runtime is **Bun** (not Node), despite the generic template text above. `bun` is installed to `~/.bun/bin` and symlinked at `/usr/local/bin/bun`. The startup update script runs `bun install` (root) and `bun install --cwd client`.

Services (see README/`package.json` for the canonical commands):

| Service | Command | Port | Notes |
| --- | --- | --- | --- |
| API (Hono, Bun) | `bun run dev` | 3000 | Boots the in-process import worker; serves `/api/*`. Health: `GET /api/settings/status`. |
| Client (Vite/React) | `bun run dev:client` | 5173 | Vite proxies `/api` → `http://localhost:3000`. Use this URL for UI testing. |

Non-obvious caveats:
- `.env` is required (server runs with `--env-file=.env`). Copy it once with `cp .env.example .env`; defaults in `server/lib/env.ts` let the server boot with no external keys.
- Migrations use a **custom runner** `bun run db:migrate` (reads `drizzle/*.sql`), NOT `drizzle-kit migrate`. It is idempotent. `bun run db:seed` inserts one sample recipe and is a no-op if any recipe already exists. Run these only when the schema/seed changes; the SQLite file at `.data/database.db` persists in the snapshot.
- **MinIO / S3 image storage** requires Docker (`docker compose up minio minio-init`), and Docker is NOT installed here. The core recipe library (create/edit/list/search) works fully without it; only recipe image upload/serve needs MinIO.
- OpenAI recipe-import (`OPENAI_API_KEY`) and Swiggy cart-sync (Swiggy OAuth/MCP) are feature-gated external integrations; they are not needed to run or test the core app.
- Lint (`bun run lint`) currently reports one pre-existing error in `server/services/swiggy/food.ts` plus fast-refresh warnings; this is unrelated to environment setup. Server and client typecheck (`bun run typecheck`, `bun run --cwd client typecheck`) pass cleanly.
