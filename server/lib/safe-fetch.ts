import { env } from '@server/lib/env';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

function isBlockedIp(ip: string): boolean {
  if (ip === '::1' || ip === '0.0.0.0') {
    return true;
  }
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    return (
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80') ||
      normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') ||
      normalized.startsWith('::ffff:192.168.') ||
      /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    );
  }

  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }
  const [a = 0, b = 0] = parts;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a >= 224) {
    return true;
  }
  return false;
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new SafeFetchError('Localhost URLs are not allowed');
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new SafeFetchError('Private or reserved IP addresses are not allowed');
    }
    return;
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new SafeFetchError('Unable to resolve hostname');
  }
  for (const record of records) {
    if (isBlockedIp(record.address)) {
      throw new SafeFetchError('Hostname resolves to a private or reserved address');
    }
  }
}

export type SafeFetchResult = {
  finalUrl: string;
  contentType: string | null;
  body: Uint8Array;
  text: () => string;
};

export async function safeFetch(inputUrl: string): Promise<SafeFetchResult> {
  let current = new URL(inputUrl);
  if (current.protocol !== 'http:' && current.protocol !== 'https:') {
    throw new SafeFetchError('Only http and https URLs are supported');
  }

  for (let redirect = 0; redirect <= env.PUBLIC_URL_FETCH_MAX_REDIRECTS; redirect += 1) {
    await assertPublicHostname(current.hostname);

    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(env.PUBLIC_URL_FETCH_TIMEOUT_MS),
      headers: {
        'user-agent': 'FoodJournalBot/1.0 (+localhost)',
        accept: 'text/html,application/xhtml+xml,application/json,image/*,*/*;q=0.8',
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new SafeFetchError('Redirect missing Location header');
      }
      current = new URL(location, current);
      if (current.protocol !== 'http:' && current.protocol !== 'https:') {
        throw new SafeFetchError('Redirected to a non-http(s) URL');
      }
      continue;
    }

    if (!response.ok) {
      throw new SafeFetchError(`Upstream responded with ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    const reader = response.body?.getReader();
    if (!reader) {
      throw new SafeFetchError('Empty response body');
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }
      total += value.byteLength;
      if (total > env.PUBLIC_URL_FETCH_MAX_BYTES) {
        throw new SafeFetchError('Response exceeded maximum allowed size');
      }
      chunks.push(value);
    }

    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return {
      finalUrl: current.toString(),
      contentType,
      body,
      text: () => new TextDecoder('utf-8').decode(body),
    };
  }

  throw new SafeFetchError('Too many redirects');
}
