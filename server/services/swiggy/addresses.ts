import type { SwiggyAddress } from '@shared/types';
import { db } from '@server/db';
import { appSettings } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import { callSwiggyTool, type SwiggyServer } from './mcp';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asAddresses(value: unknown): SwiggyAddress[] {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const nestedData = record?.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : null;
  const root = Array.isArray(value)
    ? value
    : Array.isArray(record?.addresses)
      ? record.addresses
      : Array.isArray(nestedData?.addresses)
        ? nestedData.addresses
        : [];
  if (!Array.isArray(root)) return [];
  return root.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const source = item as Record<string, unknown>;
    const rawId = source.addressId ?? source.address_id ?? source.id;
    const addressId = typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : null;
    if (!addressId) return [];
    return [
      {
        addressId,
        label: asString(source.addressTag) ?? asString(source.addressCategory) ?? asString(source.label),
        displayAddress:
          asString(source.addressLine) ?? asString(source.displayAddress) ?? asString(source.address),
      },
    ];
  });
}

export async function listAddresses(server: SwiggyServer = 'food'): Promise<SwiggyAddress[]> {
  return asAddresses(await callSwiggyTool(server, 'get_addresses', {}));
}

export async function getPreferredAddress(): Promise<SwiggyAddress | null> {
  const setting = (await db.select().from(appSettings).where(eq(appSettings.key, 'preferred_address')).limit(1))[0];
  if (!setting) return null;
  try {
    return JSON.parse(setting.valueJson) as SwiggyAddress;
  } catch {
    return null;
  }
}

export async function setPreferredAddress(address: SwiggyAddress): Promise<SwiggyAddress> {
  await ensureAddressSelected(address.addressId);
  await db
    .insert(appSettings)
    .values({ key: 'preferred_address', valueJson: JSON.stringify(address) })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { valueJson: JSON.stringify(address), updatedAt: new Date().toISOString() },
    });
  return address;
}

export async function ensureAddressSelected(addressId: string, server: SwiggyServer = 'food'): Promise<SwiggyAddress> {
  const address = (await listAddresses(server)).find((candidate) => candidate.addressId === addressId);
  if (!address) throw new Error('The selected Swiggy address is unavailable');
  return address;
}
