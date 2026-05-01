/**
 * Fetch with exponential backoff retry for transient HTTP errors (429, 500, 502, 503, 504).
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  const transient = new Set([429, 500, 502, 503, 504]);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok || !transient.has(resp.status)) return resp;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
      lastError = new Error(`HTTP ${resp.status}`);
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError ?? new Error('Request failed');
}
