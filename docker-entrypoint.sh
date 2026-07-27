#!/bin/sh
set -e

if [ -f .env ]; then
  bun --env-file=.env server/db/migrate.ts
  exec bun --env-file=.env server/index.ts
fi

bun server/db/migrate.ts
exec bun server/index.ts
