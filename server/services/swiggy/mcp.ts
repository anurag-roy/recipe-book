import { env } from '@server/lib/env';
import { getAccessToken } from './oauth';

export type SwiggyServer = 'food' | 'im';

const allowedTools = {
  food: new Set([
    'get_addresses',
    'search_restaurants',
    'search_menu',
    'get_restaurant_menu',
    'get_food_cart',
    'update_food_cart',
    'flush_food_cart',
  ]),
  im: new Set(['get_addresses', 'search_products', 'get_cart', 'update_cart', 'clear_cart']),
};
const prohibitedTools = /(?:place_food_order|checkout|get_payment_options|check_payment_status|confirm_order|track_)/;

export class SwiggyAuthError extends Error {
  constructor() {
    super('Swiggy authorization failed; reconnect required');
    this.name = 'SwiggyAuthError';
  }
}

function endpoint(server: SwiggyServer): string {
  return server === 'food' ? env.SWIGGY_MCP_FOOD_URL : env.SWIGGY_MCP_INSTAMART_URL;
}

function parseToolResult(result: unknown): unknown {
  if (!result || typeof result !== 'object') return result;
  const record = result as { structuredContent?: unknown; content?: unknown };
  if (record.structuredContent !== undefined) return record.structuredContent;
  if (!Array.isArray(record.content)) return result;
  const parsed = record.content.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const content = item as { text?: unknown; json?: unknown };
    if (content.json !== undefined) return content.json;
    if (typeof content.text !== 'string') return item;
    try {
      return JSON.parse(content.text) as unknown;
    } catch {
      return content.text;
    }
  });
  return parsed.length === 1 ? parsed[0] : parsed;
}

async function parseRpcResponse(response: Response): Promise<{ error?: { message?: string }; result?: unknown }> {
  const text = await response.text();
  const json = text.startsWith('data:')
    ? text
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trim())
        .find((line) => line.length > 0)
    : text;
  if (!json) throw new Error('Swiggy MCP returned an empty response');
  return JSON.parse(json) as { error?: { message?: string }; result?: unknown };
}

export async function callSwiggyTool(
  server: SwiggyServer,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (!allowedTools[server].has(name) || prohibitedTools.test(name)) {
    throw new Error(`Swiggy tool "${name}" is not permitted`);
  }
  const token = await getAccessToken();
  const response = await fetch(endpoint(server), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 401) throw new SwiggyAuthError();
  if (!response.ok) throw new Error(`Swiggy ${server} MCP request failed (${response.status})`);
  const rpc = await parseRpcResponse(response);
  if (rpc.error) throw new Error(rpc.error.message ?? 'Swiggy MCP returned an error');
  return parseToolResult(rpc.result);
}

export async function listSwiggyTools(server: SwiggyServer): Promise<unknown> {
  const token = await getAccessToken();
  const response = await fetch(endpoint(server), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method: 'tools/list', params: {} }),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 401) throw new SwiggyAuthError();
  if (!response.ok) throw new Error(`Swiggy ${server} MCP tool listing failed (${response.status})`);
  return (await parseRpcResponse(response)).result;
}

export const createFoodClient = () => ({
  call: (name: string, args: Record<string, unknown>) => callSwiggyTool('food', name, args),
});
export const createInstamartClient = () => ({
  call: (name: string, args: Record<string, unknown>) => callSwiggyTool('im', name, args),
});
