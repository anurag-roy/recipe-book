import { Readability } from '@mozilla/readability';
import { contentFingerprint } from '@server/lib/hash';
import { safeFetch } from '@server/lib/safe-fetch';
import { parseHTML } from 'linkedom';

export type ExtractedRecipeSource = {
  sourceUrl: string | null;
  canonicalUrl: string | null;
  cleanedText: string;
  jsonLd: unknown;
  jsonLdPresent: boolean;
  imageUrl: string | null;
  fingerprint: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function findRecipeJsonLd(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeJsonLd(item);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (!isRecord(node)) {
    return null;
  }
  const type = node['@type'];
  const types = Array.isArray(type) ? type : typeof type === 'string' ? [type] : [];
  if (types.some((entry) => String(entry).toLowerCase() === 'recipe')) {
    return node;
  }
  if (node['@graph']) {
    return findRecipeJsonLd(node['@graph']);
  }
  return null;
}

function extractImageUrl(jsonLd: Record<string, unknown> | null, document: Document): string | null {
  const image = jsonLd?.image;
  if (typeof image === 'string') {
    return image;
  }
  if (Array.isArray(image) && typeof image[0] === 'string') {
    return image[0];
  }
  if (isRecord(image) && typeof image.url === 'string') {
    return image.url;
  }
  const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  return og ?? null;
}

export async function extractFromUrl(url: string): Promise<ExtractedRecipeSource> {
  const fetched = await safeFetch(url);
  const contentType = (fetched.contentType ?? '').toLowerCase();
  if (!contentType.includes('html') && !contentType.includes('xml') && !contentType.includes('text/plain')) {
    throw new Error('URL did not return HTML content');
  }

  const { document } = parseHTML(fetched.text());
  const canonical =
    document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
    document.querySelector('meta[property="og:url"]')?.getAttribute('content') ??
    fetched.finalUrl;
  const canonicalUrl = new URL(canonical, fetched.finalUrl).toString();

  let jsonLd: unknown = null;
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed: unknown = JSON.parse(script.textContent ?? '');
      const recipe = findRecipeJsonLd(parsed);
      if (recipe) {
        jsonLd = recipe;
        break;
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  const reader = new Readability(document as unknown as Document);
  const article = reader.parse();
  const cleanedText = (article?.textContent ?? document.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (cleanedText.length < 40) {
    throw new Error('Could not extract meaningful article text from the page');
  }

  const imageUrl = extractImageUrl(isRecord(jsonLd) ? jsonLd : null, document as unknown as Document);

  return {
    sourceUrl: url,
    canonicalUrl,
    cleanedText,
    jsonLd,
    jsonLdPresent: jsonLd !== null,
    imageUrl,
    fingerprint: contentFingerprint(`${canonicalUrl}\n${cleanedText}`),
  };
}

export function extractFromText(sourceText: string): ExtractedRecipeSource {
  const cleanedText = sourceText.replace(/\s+/g, ' ').trim();
  return {
    sourceUrl: null,
    canonicalUrl: null,
    cleanedText,
    jsonLd: null,
    jsonLdPresent: false,
    imageUrl: null,
    fingerprint: contentFingerprint(cleanedText),
  };
}
