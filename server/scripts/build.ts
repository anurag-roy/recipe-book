import { $ } from 'bun';

await $`bun install`;
await $`bun install`.cwd('client');
await $`bun run build`.cwd('client');
