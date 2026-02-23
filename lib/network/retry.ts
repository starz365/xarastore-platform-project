// lib/network/retry.ts

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 3000,
  }: RetryOptions = {}
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;

      if (attempt > retries) {
        throw err;
      }

      const isTransient =
        err?.cause?.code === 'EAI_AGAIN' ||
        err?.cause?.code === 'ECONNRESET' ||
        err?.cause?.code === 'ETIMEDOUT';

      if (!isTransient) {
        throw err;
      }

      const backoff =
        Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs) +
        Math.random() * 100;

      await sleep(backoff);
    }
  }
}
