# Food Journal

A localhost-only personal recipe library with AI import and confirmation-gated Swiggy Food / Instamart cart sync.

Food Journal never places Swiggy orders in the MVP. It can search dishes, build ingredient baskets, and — only after an explicit review — update your real Swiggy carts. Finish checkout in the Swiggy app.

## Stack

| Layer          | Choice                                    |
| -------------- | ----------------------------------------- |
| Runtime        | Bun                                       |
| API            | Hono (RPC-typed)                          |
| Database       | Drizzle ORM + Bun SQLite                  |
| Object storage | MinIO via Bun `S3Client`                  |
| AI             | OpenAI Responses API (`gpt-5.4-nano`)     |
| Frontend       | Vite 8 + React 19 + TanStack Router/Query |
| UI             | shadcn/ui (Base UI) + Tailwind CSS v4     |

## Quick start (Docker Compose)

```bash
cp .env.example .env
# set OPENAI_API_KEY in .env

docker compose up --build
```

App: [http://localhost:3000](http://localhost:3000)  
MinIO console: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)

## Local Bun development

```bash
# Terminal A — MinIO + bucket
docker compose up minio minio-init

# Terminal B — API
cp .env.example .env   # set OPENAI_API_KEY
bun install
bun install --cwd client
bun run db:migrate
bun run db:seed        # optional sample recipe
bun run dev

# Terminal C — Vite client
bun run dev:client
```

Hot-reload Compose override:

```bash
docker compose -f compose.yml -f compose.dev.yml up --build
```

Vite proxies `/api` to the Bun API on port 3000.

## Features

- Import recipes from pasted text or public server-fetchable blog URLs
- Persist import jobs with progress, retries, and duplicate detection
- Manual recipe create/edit with ingredients, instructions, tags, favorites
- Title / ingredient / tag search via SQLite FTS5
- Private MinIO image storage with placeholder + retryable image warnings
- Connect Swiggy via OAuth 2.1 PKCE (`http://localhost` callback)
- Food: up to 5 ranked dish offers → review → sync Food cart
- Instamart: serving-scaled ingredient basket → merge review → replace Instamart cart
- No checkout / place-order tools are exposed

## Swiggy auth notes

- Direct developer OAuth with PKCE and dynamic client registration
- Access tokens last ~5 days; v1 has no refresh-token issuance
- Tokens are stored in local SQLite (plaintext by explicit MVP choice)
- Prefer a delivery address in Settings; it is refreshed and confirmed before commerce flows
- OpenAI tracing is enabled and may include Swiggy tool responses in agent context

## Scripts

| Script                 | Description          |
| ---------------------- | -------------------- |
| `bun run dev`          | Bun API with watch   |
| `bun run dev:client`   | Vite client          |
| `bun run build`        | Build client         |
| `bun run start`        | Production server    |
| `bun run db:migrate`   | Apply SQL migrations |
| `bun run db:seed`      | Seed a sample recipe |
| `bun run typecheck`    | Typecheck server     |
| `bun run lint` / `fmt` | Oxlint / Oxfmt       |

## Data locations

- SQLite: `.data/database.db`
- Recipe images: MinIO bucket `food-journal`
- Compose volumes: `app-data`, `minio-data`

## Safety boundary

Cart mutations require a one-time Cart Review hash. If live cart/availability/price data changes, confirmation is requested again. Checkout, payment, and order-placement tools are never called.

## Domain docs

- [CONTEXT.md](./CONTEXT.md) — glossary
- [docs/adr](./docs/adr) — architecture decisions
