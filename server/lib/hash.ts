export function sha256Hex(input: string | ArrayBuffer | Uint8Array): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(input);
  return hasher.digest('hex');
}

export function sha256HexBytes(input: ArrayBuffer | Uint8Array): string {
  return sha256Hex(input);
}

export function contentFingerprint(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
  return sha256Hex(normalized);
}
