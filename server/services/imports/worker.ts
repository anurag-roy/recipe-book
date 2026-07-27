import type { ImportJob } from '@shared/types';
import { db } from '@server/db';
import { importJobs } from '@server/db/schema';
import { logger } from '@server/lib/logger';
import { processImportJob } from '@server/services/imports/processor';
import { and, asc, eq, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';

let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

export function mapImportJob(job: typeof importJobs.$inferSelect): ImportJob {
  return {
    id: job.id,
    sourceType: job.sourceType as 'url' | 'text',
    sourceUrl: job.sourceUrl,
    status: job.status as ImportJob['status'],
    stageMessage: job.stageMessage,
    error: job.error,
    recipeId: job.recipeId,
    duplicateOfRecipeId: job.duplicateOfRecipeId,
    imageWarning: job.imageWarning,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  };
}

function claimNextJob(): number | null {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const job = db
    .select()
    .from(importJobs)
    .where(
      or(
        eq(importJobs.status, 'queued'),
        and(
          inArray(importJobs.status, ['fetching', 'extracting', 'structuring', 'copying_image']),
          isNotNull(importJobs.lockedAt),
          lt(importJobs.lockedAt, staleBefore)
        )
      )
    )
    .orderBy(asc(importJobs.createdAt))
    .get();

  if (!job) {
    return null;
  }

  const updated = db
    .update(importJobs)
    .set({
      status: 'fetching',
      lockedAt: nowIso(),
      attemptCount: sql`${importJobs.attemptCount} + 1`,
      updatedAt: nowIso(),
      error: null,
    })
    .where(eq(importJobs.id, job.id))
    .returning()
    .get();

  return updated?.id ?? null;
}

async function tick(): Promise<void> {
  if (running) {
    return;
  }
  running = true;
  try {
    const jobId = claimNextJob();
    if (jobId !== null) {
      await processImportJob(jobId);
    }
  } catch (error) {
    logger.error(`Import worker tick failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    running = false;
  }
}

export function startImportWorker(): void {
  if (timer) {
    return;
  }
  timer = setInterval(() => {
    void tick();
  }, 2000);
  void tick();
  logger.info('Import worker started');
}

export async function createImportJob(input: {
  sourceType: 'url' | 'text';
  sourceUrl?: string;
  sourceText?: string;
}): Promise<ImportJob> {
  const job = db
    .insert(importJobs)
    .values({
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      sourceText: input.sourceText ?? null,
      status: 'queued',
      stageMessage: 'Queued',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    .returning()
    .get();
  if (!job) {
    throw new Error('Failed to create import job');
  }
  return mapImportJob(job);
}

export async function listImportJobs(): Promise<ImportJob[]> {
  return db.select().from(importJobs).orderBy(asc(importJobs.createdAt)).limit(100).all().map(mapImportJob);
}

export async function getImportJob(id: number): Promise<ImportJob | null> {
  const job = db.select().from(importJobs).where(eq(importJobs.id, id)).get();
  return job ? mapImportJob(job) : null;
}

export async function retryImportJob(id: number): Promise<ImportJob> {
  const job = db.select().from(importJobs).where(eq(importJobs.id, id)).get();
  if (!job) {
    throw new Error('Import job not found');
  }
  if (job.status !== 'failed') {
    throw new Error('Only failed import jobs can be retried');
  }
  const updated = db
    .update(importJobs)
    .set({
      status: 'queued',
      stageMessage: 'Queued for retry',
      error: null,
      lockedAt: null,
      completedAt: null,
      updatedAt: nowIso(),
    })
    .where(eq(importJobs.id, id))
    .returning()
    .get();
  if (!updated) {
    throw new Error('Import job not found');
  }
  return mapImportJob(updated);
}
