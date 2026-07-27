import { env } from '@server/lib/env';
import { sha256Hex } from '@server/lib/hash';
import { safeFetch } from '@server/lib/safe-fetch';
import { S3Client } from 'bun';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maxImageBytes = 5 * 1024 * 1024;

function createClient() {
  return new S3Client({
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    bucket: env.S3_BUCKET,
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
  });
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

export function imageObjectKey(hash: string, contentType: string): string {
  return `recipe-images/${hash}.${extensionFor(contentType)}`;
}

export async function ensureBucketExists(): Promise<void> {
  const s3 = createClient();
  try {
    await s3.file('.keep').exists();
  } catch {
    // Bucket may be empty; compose init creates it.
  }
}

export async function putObject(key: string, data: Uint8Array | string, contentType: string): Promise<void> {
  const s3 = createClient();
  await s3.file(key).write(data, { type: contentType });
}

function contentTypeForDemoAsset(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

async function getDemoObject(key: string): Promise<{ data: Uint8Array; contentType: string | null }> {
  const relative = key.slice('demo/'.length);
  if (!relative || relative.includes('..') || path.isAbsolute(relative)) {
    throw new Error('Object not found');
  }
  const filePath = path.join(process.cwd(), 'server/demo/assets', relative);
  const data = new Uint8Array(await readFile(filePath));
  return { data, contentType: contentTypeForDemoAsset(relative) };
}

export async function getObject(key: string): Promise<{ data: Uint8Array; contentType: string | null }> {
  if (key.startsWith('demo/')) {
    return getDemoObject(key);
  }
  const s3 = createClient();
  const file = s3.file(key);
  const exists = await file.exists();
  if (!exists) {
    throw new Error('Object not found');
  }
  const data = new Uint8Array(await file.arrayBuffer());
  return { data, contentType: file.type || null };
}

export async function deleteObject(key: string): Promise<void> {
  const s3 = createClient();
  await s3.file(key).delete();
}

export async function downloadAndStoreImage(sourceUrl: string): Promise<{
  objectKey: string;
  contentType: string;
  sourceUrl: string;
}> {
  const fetched = await safeFetch(sourceUrl);
  const contentType = (fetched.contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (!allowedImageTypes.has(contentType)) {
    throw new Error(`Unsupported image type: ${contentType || 'unknown'}`);
  }
  if (fetched.body.byteLength > maxImageBytes) {
    throw new Error('Image exceeds 5MB limit');
  }
  const hash = sha256Hex(fetched.body);
  const objectKey = imageObjectKey(hash, contentType);
  await putObject(objectKey, fetched.body, contentType);
  return { objectKey, contentType, sourceUrl: fetched.finalUrl };
}
