import { db } from '@server/db';
import { importJobs } from '@server/db/schema';
import { logger } from '@server/lib/logger';
import { downloadAndStoreImage } from '@server/lib/object-storage';
import { parseRecipeFromEvidence } from '@server/lib/openai';
import { extractFromText, extractFromUrl } from '@server/services/imports/extract';
import {
  createRecipe,
  findByCanonicalUrl,
  findByFingerprint,
  structuredToWriteInput,
} from '@server/services/recipes/repository';
import { eq } from 'drizzle-orm';

function nowIso(): string {
  return new Date().toISOString();
}

function setJob(
  id: number,
  values: Partial<{
    status: string;
    stageMessage: string | null;
    error: string | null;
    recipeId: number | null;
    duplicateOfRecipeId: number | null;
    imageWarning: string | null;
    lockedAt: string | null;
    completedAt: string | null;
  }>
): void {
  db.update(importJobs)
    .set({ ...values, updatedAt: nowIso() })
    .where(eq(importJobs.id, id))
    .run();
}

export async function processImportJob(jobId: number): Promise<void> {
  const job = db.select().from(importJobs).where(eq(importJobs.id, jobId)).get();
  if (!job) {
    return;
  }

  try {
    setJob(jobId, { status: 'fetching', stageMessage: 'Fetching source', error: null });

    const extracted =
      job.sourceType === 'url' ? await extractFromUrl(job.sourceUrl ?? '') : extractFromText(job.sourceText ?? '');

    if (extracted.canonicalUrl) {
      const duplicate = await findByCanonicalUrl(extracted.canonicalUrl);
      if (duplicate?.id) {
        setJob(jobId, {
          status: 'duplicate',
          stageMessage: 'Duplicate canonical URL',
          duplicateOfRecipeId: duplicate.id,
          lockedAt: null,
          completedAt: nowIso(),
        });
        return;
      }
    }

    const duplicateByHash = await findByFingerprint(extracted.fingerprint);
    if (duplicateByHash?.id) {
      setJob(jobId, {
        status: 'duplicate',
        stageMessage: 'Duplicate recipe content',
        duplicateOfRecipeId: duplicateByHash.id,
        lockedAt: null,
        completedAt: nowIso(),
      });
      return;
    }

    setJob(jobId, { status: 'extracting', stageMessage: 'Extracted source evidence' });
    setJob(jobId, { status: 'structuring', stageMessage: 'Structuring with OpenAI' });

    const structured = await parseRecipeFromEvidence({
      cleanedText: extracted.cleanedText,
      jsonLd: extracted.jsonLd,
      sourceUrl: extracted.sourceUrl,
    });

    let imageObjectKey: string | null = null;
    let imageSourceUrl: string | null = structured.imageUrl ?? extracted.imageUrl;
    let imageContentType: string | null = null;
    let imageWarning: string | null = null;

    if (imageSourceUrl) {
      setJob(jobId, { status: 'copying_image', stageMessage: 'Copying recipe image' });
      try {
        const stored = await downloadAndStoreImage(imageSourceUrl);
        imageObjectKey = stored.objectKey;
        imageSourceUrl = stored.sourceUrl;
        imageContentType = stored.contentType;
      } catch (error) {
        imageWarning = error instanceof Error ? error.message : 'Failed to copy image';
        logger.warn(`Image import failed for job ${jobId}: ${imageWarning}`);
      }
    }

    const recipe = await createRecipe(
      structuredToWriteInput(structured, {
        sourceUrl: extracted.sourceUrl,
        canonicalUrl: extracted.canonicalUrl,
        cleanedText: extracted.cleanedText,
        contentFingerprint: extracted.fingerprint,
        jsonLdPresent: extracted.jsonLdPresent,
        imageObjectKey,
        imageSourceUrl,
        imageContentType,
        imageWarning,
      })
    );

    setJob(jobId, {
      status: 'completed',
      stageMessage: imageWarning ? 'Completed with image warning' : 'Completed',
      recipeId: recipe.id ?? null,
      imageWarning,
      lockedAt: null,
      completedAt: nowIso(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    logger.error(`Import job ${jobId} failed: ${message}`);
    setJob(jobId, {
      status: 'failed',
      stageMessage: 'Failed',
      error: message,
      lockedAt: null,
      completedAt: nowIso(),
    });
  }
}
