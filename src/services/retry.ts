/**
 * Wait for a specified number of milliseconds
 */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff retry logic
 * @param fn Function to execute
 * @param retries Maximum number of retries (default 3)
 * @param baseDelay Base delay in ms (default 1000)
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    baseDelay = 1000
): Promise<T> {
    let attempt = 0;

    while (attempt < retries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= retries) {
                throw error;
            }
            // Calculate delay with jitter to prevent thundering herd
            const backoff = baseDelay * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 200;
            await delay(backoff + jitter);
        }
    }

    throw new Error('Unreachable code');
}
