/**
 * Retry a function with exponential backoff
 * Handles GitHub API rate limits and transient errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      // Last attempt - throw the error
      if (i === maxRetries - 1) {
        throw err;
      }

      // Check if it's a rate limit or abuse detection error
      const shouldRetry =
        err.status === 403 ||
        err.status === 429 ||
        err.status === 502 ||
        err.status === 503;

      if (!shouldRetry) {
        // For other errors, throw immediately
        throw err;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, i);
      console.warn(
        `Retry attempt ${i + 1}/${maxRetries} after ${delay}ms. Error:`,
        err.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Retry failed");
}
