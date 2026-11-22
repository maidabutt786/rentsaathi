/**
 * Small resilient client for the self-hosted AI service.
 * Retries transient failures (network, 429, 5xx) with exponential backoff + jitter.
 */
export class AIRequestError extends Error {
  constructor(message, { status = 0, retryable = false } = {}) {
    super(message);
    this.name = "AIRequestError";
    this.status = status;
    this.retryable = retryable;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class AIClient {
  constructor({ baseUrl, apiKey, timeoutMs = 15000, maxRetries = 3, fetchImpl = globalThis.fetch, logger = console }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.fetchImpl = fetchImpl;
    this.logger = logger;
  }

  async request(path, { method = "POST", body } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": this.apiKey,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          const retryable = response.status === 429 || response.status >= 500;
          throw new AIRequestError(`AI service ${response.status}: ${text.slice(0, 300)}`, {
            status: response.status,
            retryable,
          });
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        const retryable = error instanceof AIRequestError ? error.retryable : true;
        if (!retryable || attempt === this.maxRetries) break;
        const delay = Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
        this.logger.warn(`[ai-client] ${method} ${path} failed (attempt ${attempt + 1}), retrying in ${delay}ms`, {
          error: error.message,
        });
        await sleep(delay);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }

  analyzeListing({ listingId, imageUrls, metadata }) {
    return this.request("/analyze-listing", { body: { listingId, imageUrls, metadata } });
  }

  indexListing({ listingId, imageUrls }) {
    return this.request("/index-listing", { body: { listingId, imageUrls } });
  }

  deleteIndex(listingId) {
    return this.request(`/index-listing/${encodeURIComponent(listingId)}`, { method: "DELETE" });
  }
}
