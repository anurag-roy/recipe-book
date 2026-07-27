# ADR 0002: Bun runtime with native SQLite and MinIO

## Status

Accepted

## Context

The app needs Bun's native S3 client for MinIO, a single-server localhost deployment, and SQLite persistence. The boilerplate defaults to Node.js + libSQL.

## Decision

- Use Bun as package manager and server runtime (`Bun.serve`, Bun lockfiles, Bun Docker images).
- Persist data with `bun:sqlite` through `drizzle-orm/bun-sqlite` and versioned Drizzle migrations.
- Store recipe images as private MinIO objects via Bun `S3Client`, served through the API.
- Run the stack with Docker Compose (production-like base + hot-reload override).

## Consequences

Node-specific packages (`tsx`, `@hono/node-server`, `@libsql/client`) are removed. Local development depends on Bun and MinIO. Image URLs are not stored as long-lived public links; the app serves objects from private storage.
