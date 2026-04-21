import { and, asc, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../db";
import { aiEditJobs, ticketBalances, ticketTransactions } from "../schema";
import { generateEditPlan, type EditJobInput } from "../aiEditAssistant";
import { buildAIEditStoredResult, parseAIEditStoredResult } from "./aiEditArtifacts";
import { parseStoredVideoSpec } from "./parseVideoSpec";

/** Vercel 本番では既定でメモリキュー OFF（DB pending + cron）。ローカルは既定 ON。 */
export function useAIEditMemoryQueue(): boolean {
  if (process.env.AI_EDIT_USE_MEMORY_QUEUE === "1") return true;
  if (process.env.AI_EDIT_USE_MEMORY_QUEUE === "0") return false;
  return process.env.VERCEL !== "1";
}

function parseJobVideoUrls(job: InferSelectModel<typeof aiEditJobs>): string[] {
  if (job.videoUrls) {
    try {
      const parsed = JSON.parse(job.videoUrls) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean);
      }
    } catch {
      // ignore
    }
  }
  return job.videoUrl?.trim() ? [job.videoUrl.trim()] : [];
}

function getBaseVideoSpec(job: InferSelectModel<typeof aiEditJobs>) {
  const stored = parseAIEditStoredResult(job.result ?? null);
  return stored?.baseSpec ?? parseStoredVideoSpec(job.videoSpec ?? null);
}

async function refundAIEditTickets(params: {
  userId: number;
  amount: number;
  type: string;
  description: string;
  referenceId: string;
}) {
  const { userId, amount, type, description, referenceId } = params;
  if (!Number.isFinite(amount) || amount <= 0) return;
  const key = String(userId);
  const balRows = await db.select().from(ticketBalances).where(eq(ticketBalances.userId, key)).limit(1);
  const currentBalance = balRows[0]?.balance ?? 0;
  if (balRows.length === 0) {
    await db.insert(ticketBalances).values({ userId: key, balance: amount });
  } else {
    await db
      .update(ticketBalances)
      .set({ balance: currentBalance + amount, updatedAt: new Date() })
      .where(eq(ticketBalances.userId, key));
  }
  await db.insert(ticketTransactions).values({
    userId: key,
    amount,
    type,
    referenceId,
    description,
  });
}

export type AIEditPlanWorkerParams = {
  jobId: number;
  revisionPrompt?: string | null;
  refundAmount?: number;
  refundType?: string;
  refundDescription?: string;
};

/**
 * メモリキューなし（Vercel 本番など）で、pending ジョブを即座に処理する。
 * `processing` に遷移してから `runAIEditPlanWorker` を実行する。
 */
export async function processAIEditJobInline(params: AIEditPlanWorkerParams): Promise<void> {
  await db
    .update(aiEditJobs)
    .set({ status: "processing", updatedAt: new Date() } as Partial<InferSelectModel<typeof aiEditJobs>>)
    .where(eq(aiEditJobs.id, params.jobId));
  await runAIEditPlanWorker(params);
}

/** Claude プラン生成を 1 ジョブ分実行（失敗時は failed + 返金）。呼び出し元で `processing` に遷移済みであること。 */
export async function runAIEditPlanWorker(params: AIEditPlanWorkerParams): Promise<void> {
  const { jobId, revisionPrompt, refundAmount = 0, refundType, refundDescription } = params;

  const [freshJob] = await db.select().from(aiEditJobs).where(eq(aiEditJobs.id, jobId));
  if (!freshJob) return;

  try {
    const baseSpec = getBaseVideoSpec(freshJob);
    if (!baseSpec) {
      throw new Error("AI Edit job has no valid source spec");
    }

    const promptUsed = revisionPrompt?.trim()
      ? `${freshJob.prompt.trim()}\n\nRevision request:\n${revisionPrompt.trim()}`
      : freshJob.prompt.trim();
    const videoUrls = parseJobVideoUrls(freshJob);
    const editInput: EditJobInput = {
      planMinutes: (freshJob.planMinutes ?? 15) as 15 | 30 | 45 | 60,
      videoUrls,
      logoUrl: freshJob.logoUrl,
      telop: freshJob.telop,
      targetAudience: freshJob.targetAudience,
      tone: freshJob.tone,
      prompt: promptUsed,
    };
    const generated = await generateEditPlan(editInput);
    const storedResult = buildAIEditStoredResult({
      plan: generated.plan,
      promptUsed,
      provider: generated.provider,
      baseSpec,
      revisionPrompt,
    });

    await db
      .update(aiEditJobs)
      .set({
        status: "completed",
        result: JSON.stringify(storedResult),
        videoSpec: JSON.stringify(storedResult.renderSpec),
        updatedAt: new Date(),
      } as Partial<InferSelectModel<typeof aiEditJobs>>)
      .where(eq(aiEditJobs.id, jobId));
  } catch (error) {
    console.error("[ai-edit] Processing failed:", error);
    await db
      .update(aiEditJobs)
      .set({ status: "failed", updatedAt: new Date() } as Partial<InferSelectModel<typeof aiEditJobs>>)
      .where(eq(aiEditJobs.id, jobId));

    if (refundAmount > 0 && refundType && refundDescription) {
      await refundAIEditTickets({
        userId: freshJob.userId,
        amount: refundAmount,
        type: refundType,
        description: refundDescription,
        referenceId: String(freshJob.id),
      });
    }
  }
}

/** Cron: pending を 1 件取り上げて処理（同時実行は DB の競合で片方がスキップ）。 */
export async function claimAndProcessNextPendingAIEditJob(): Promise<{ processed: boolean; jobId?: number }> {
  const row = await db.transaction(async (tx) => {
    const pending = await tx
      .select()
      .from(aiEditJobs)
      .where(eq(aiEditJobs.status, "pending"))
      .orderBy(asc(aiEditJobs.id))
      .limit(1)
      .for("update");
    const first = pending[0];
    if (!first) return null;
    const updated = await tx
      .update(aiEditJobs)
      .set({ status: "processing", updatedAt: new Date() } as Partial<InferSelectModel<typeof aiEditJobs>>)
      .where(and(eq(aiEditJobs.id, first.id), eq(aiEditJobs.status, "pending")))
      .returning({ id: aiEditJobs.id });
    return updated[0] ?? null;
  });
  if (!row) return { processed: false };
  await runAIEditPlanWorker({ jobId: row.id });
  return { processed: true, jobId: row.id };
}
