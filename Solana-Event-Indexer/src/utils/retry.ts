
import { logger } from './logger';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 5;
  const initialDelay = options.initialDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 30000;
  const backoffFactor = options.backoffFactor ?? 2;
  const retryableErrors = options.retryableErrors ?? ['429', '500', '502', '503', '504', 'timeout', 'econnreset'];

  let attempt = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMessage = error.message || error.toString();
      const isRetryable = retryableErrors.some(code => errorMessage.toLowerCase().includes(code.toLowerCase()));

      if (attempt >= maxRetries || !isRetryable) {
        throw error;
      }

      attempt++;
      logger.warn(`Retry attempt ${attempt}/${maxRetries} after error: ${errorMessage}. Waiting ${delay}ms...`);

      await sleep(delay);
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }
}
