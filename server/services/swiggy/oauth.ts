import type { SwiggyAddress, SwiggyConnectionStatus } from '@shared/types';
import { DEMO_ADDRESS, isDemoMode } from '@server/demo';
import { db } from '@server/db';
import { appSettings, swiggyOAuthClients, swiggyOAuthStates, swiggyTokens } from '@server/db/schema';
import { pkceChallenge, randomUrlSafe } from '@server/lib/crypto-hash';
import { env } from '@server/lib/env';
import { logger } from '@server/lib/logger';
import { desc, eq, lt } from 'drizzle-orm';

const stateTtlMs = 10 * 60 * 1000;
const privacyDisclosure =
  'OpenAI may see Swiggy MCP tool responses while tracing is enabled. Tokens are never sent to OpenAI.';

type RegisteredClient = { client_id: string; client_secret?: string; [key: string]: unknown };
type TokenResponse = { access_token: string; token_type?: string; scope?: string; expires_in?: number };

async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  return body as T;
}

async function registeredClient() {
  const existing = await db.select().from(swiggyOAuthClients).orderBy(desc(swiggyOAuthClients.id)).limit(1);
  if (existing[0]) return existing[0];

  const response = await fetch(env.SWIGGY_OAUTH_REGISTER_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Food Journal',
      redirect_uris: [env.SWIGGY_OAUTH_REDIRECT_URI],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
    }),
  });
  if (!response.ok) throw new Error(`Swiggy client registration failed (${response.status})`);
  const client = await readJson<RegisteredClient>(response);
  if (!client.client_id) throw new Error('Swiggy registration returned no client_id');
  const [saved] = await db
    .insert(swiggyOAuthClients)
    .values({
      clientId: client.client_id,
      clientSecret: client.client_secret ?? null,
      redirectUri: env.SWIGGY_OAUTH_REDIRECT_URI,
      metadataJson: JSON.stringify(client),
    })
    .returning();
  if (!saved) throw new Error('Unable to persist Swiggy OAuth client');
  return saved;
}

export async function startAuthorization(): Promise<{ authorizeUrl: string }> {
  if (isDemoMode()) {
    await db
      .insert(appSettings)
      .values({ key: 'preferred_address', valueJson: JSON.stringify(DEMO_ADDRESS) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { valueJson: JSON.stringify(DEMO_ADDRESS), updatedAt: new Date().toISOString() },
      });
    return { authorizeUrl: `${env.APP_BASE_URL}/settings?swiggy=connected` };
  }
  const client = await registeredClient();
  const state = randomUrlSafe();
  const codeVerifier = randomUrlSafe(48);
  const codeChallenge = await pkceChallenge(codeVerifier);
  await db.delete(swiggyOAuthStates).where(lt(swiggyOAuthStates.expiresAt, new Date().toISOString()));
  await db.insert(swiggyOAuthStates).values({
    state,
    codeVerifier,
    redirectUri: env.SWIGGY_OAUTH_REDIRECT_URI,
    expiresAt: new Date(Date.now() + stateTtlMs).toISOString(),
  });
  const authorizeUrl = new URL(env.SWIGGY_OAUTH_AUTHORIZE_URL);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  }).toString();
  return { authorizeUrl: authorizeUrl.toString() };
}

export async function completeAuthorization(code: string, state: string): Promise<void> {
  const row = (await db.select().from(swiggyOAuthStates).where(eq(swiggyOAuthStates.state, state)).limit(1))[0];
  if (!row || new Date(row.expiresAt).getTime() <= Date.now()) {
    if (row) await db.delete(swiggyOAuthStates).where(eq(swiggyOAuthStates.id, row.id));
    throw new Error('Swiggy authorization state is invalid or expired');
  }
  const client = await registeredClient();
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: row.redirectUri,
      client_id: client.clientId,
      code_verifier: row.codeVerifier,
    });
    if (client.clientSecret) body.set('client_secret', client.clientSecret);
    const response = await fetch(env.SWIGGY_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) throw new Error(`Swiggy token exchange failed (${response.status})`);
    const token = await readJson<TokenResponse>(response);
    if (!token.access_token) throw new Error('Swiggy token response omitted access_token');
    await db.delete(swiggyTokens);
    await db.insert(swiggyTokens).values({
      accessToken: token.access_token,
      tokenType: token.token_type ?? 'Bearer',
      scope: token.scope ?? null,
      expiresAt: new Date(Date.now() + (token.expires_in ?? 5 * 24 * 60 * 60) * 1000).toISOString(),
    });
  } finally {
    await db.delete(swiggyOAuthStates).where(eq(swiggyOAuthStates.id, row.id));
  }
}

export async function getAccessToken(): Promise<string> {
  if (isDemoMode()) {
    return 'demo-swiggy-token';
  }
  const token = (await db.select().from(swiggyTokens).orderBy(desc(swiggyTokens.id)).limit(1))[0];
  if (!token || new Date(token.expiresAt).getTime() <= Date.now()) {
    throw new SwiggyReconnectRequiredError();
  }
  return token.accessToken;
}

export class SwiggyReconnectRequiredError extends Error {
  constructor() {
    super('Swiggy connection is missing or expired; reconnect required');
    this.name = 'SwiggyReconnectRequiredError';
  }
}

export async function disconnect(): Promise<void> {
  try {
    const token = await getAccessToken();
    await fetch(env.SWIGGY_OAUTH_LOGOUT_URL, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  } catch (error) {
    if (!(error instanceof SwiggyReconnectRequiredError)) logger.warn('Swiggy logout failed; deleting local token');
  } finally {
    await db.delete(swiggyTokens);
  }
}

export async function getConnectionStatus(): Promise<SwiggyConnectionStatus> {
  if (isDemoMode()) {
    const setting = (await db.select().from(appSettings).where(eq(appSettings.key, 'preferred_address')).limit(1))[0];
    let preferredAddress: SwiggyAddress | null = DEMO_ADDRESS;
    if (setting) {
      try {
        preferredAddress = JSON.parse(setting.valueJson) as SwiggyAddress;
      } catch {
        preferredAddress = DEMO_ADDRESS;
      }
    } else {
      await db.insert(appSettings).values({
        key: 'preferred_address',
        valueJson: JSON.stringify(DEMO_ADDRESS),
      });
    }
    return {
      connected: true,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      preferredAddress,
      privacyDisclosure,
    };
  }

  const token = (await db.select().from(swiggyTokens).orderBy(desc(swiggyTokens.id)).limit(1))[0];
  const setting = (await db.select().from(appSettings).where(eq(appSettings.key, 'preferred_address')).limit(1))[0];
  let preferredAddress: SwiggyAddress | null = null;
  try {
    preferredAddress = setting ? (JSON.parse(setting.valueJson) as SwiggyAddress) : null;
  } catch {
    logger.warn('Ignoring malformed preferred Swiggy address');
  }
  return {
    connected: Boolean(token && new Date(token.expiresAt).getTime() > Date.now()),
    expiresAt: token?.expiresAt ?? null,
    preferredAddress,
    privacyDisclosure,
  };
}

export { privacyDisclosure };
