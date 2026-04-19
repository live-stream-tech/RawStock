type QueueTask = {
  key: string;
  handler: () => Promise<void>;
  attempts: number;
};

const pending: QueueTask[] = [];
const activeKeys = new Set<string>();
let running = false;

const MAX_ATTEMPTS = 1;

async function runQueue(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (pending.length > 0) {
      const task = pending.shift();
      if (!task) continue;
      try {
        await task.handler();
        activeKeys.delete(task.key);
      } catch (error) {
        if (task.attempts + 1 < MAX_ATTEMPTS) {
          pending.push({ ...task, attempts: task.attempts + 1 });
        } else {
          activeKeys.delete(task.key);
          console.error("[ai-edit/queue] job failed permanently:", error);
        }
      }
    }
  } finally {
    running = false;
  }
}

/**
 * 軽量なインプロセス FIFO。永続キューではないが、HTTP リクエスト内の即時 IIFE より
 * 再試行と重複防止を一箇所へ寄せられる。
 */
export function enqueueAIEditJob(key: string, handler: () => Promise<void>): boolean {
  if (activeKeys.has(key)) return false;
  activeKeys.add(key);
  pending.push({ key, handler, attempts: 0 });
  void runQueue().catch((error) => {
    console.error("[ai-edit/queue] job failed:", error);
  });
  return true;
}
