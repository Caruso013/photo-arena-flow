/**
 * Supabase Resilience Layer
 * 
 * Protects against database connection exhaustion by:
 * 1. Queuing concurrent requests to limit simultaneous connections
 * 2. Retrying failed queries with exponential backoff
 * 3. Detecting connection slot errors and applying cooldowns
 */

const MAX_CONCURRENT_REQUESTS = 10;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const CONNECTION_ERROR_COOLDOWN_MS = 5000;

let activeRequests = 0;
let connectionErrorCooldownUntil = 0;
const pendingQueue: Array<() => void> = [];

function isConnectionExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const message = typeof error === 'object' && 'message' in error
    ? String((error as { message: string }).message)
    : String(error);
  
  return (
    message.includes('remaining connection slots') ||
    message.includes('too many connections') ||
    message.includes('53300') ||
    message.includes('connection refused') ||
    message.includes('PGRST') && message.includes('pool')
  );
}

function processQueue() {
  while (pendingQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
    const next = pendingQueue.shift();
    if (next) next();
  }
}

async function waitForSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    return;
  }
  return new Promise<void>((resolve) => {
    pendingQueue.push(resolve);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a Supabase operation with connection protection.
 * Limits concurrency and retries on connection exhaustion errors.
 */
export async function resilientQuery<T>(
  operation: () => Promise<T>,
  label = 'query'
): Promise<T> {
  // Check if we're in a cooldown period
  const now = Date.now();
  if (now < connectionErrorCooldownUntil) {
    const waitTime = connectionErrorCooldownUntil - now;
    console.warn(`[Resilience] Cooldown active for ${label}, waiting ${waitTime}ms`);
    await sleep(waitTime);
  }

  await waitForSlot();
  activeRequests++;

  let lastError: unknown;

  try {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;

        if (isConnectionExhaustedError(error)) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          connectionErrorCooldownUntil = Date.now() + CONNECTION_ERROR_COOLDOWN_MS;
          console.warn(
            `[Resilience] Connection exhaustion detected in ${label}, ` +
            `attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${delay}ms`
          );
          await sleep(delay);
          continue;
        }

        // Non-connection errors: don't retry
        throw error;
      }
    }

    throw lastError;
  } finally {
    activeRequests--;
    processQueue();
  }
}

/**
 * Get current connection stats (for debugging/monitoring)
 */
export function getConnectionStats() {
  return {
    activeRequests,
    queuedRequests: pendingQueue.length,
    cooldownActive: Date.now() < connectionErrorCooldownUntil,
    cooldownRemainingMs: Math.max(0, connectionErrorCooldownUntil - Date.now()),
  };
}
