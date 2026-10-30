// ==========================================================================
// Orbit Watch — Resilient Scientific API Client
// Handles timeouts, caching, request cancellation, and telemetry state.
// ==========================================================================

const DEFAULT_TIMEOUT_MS = 12000;

export function getStoredApiKey() {
  try {
    return window.ORBIT_WATCH_API_KEY || localStorage.getItem("nasa_api_key") || "DEMO_KEY";
  } catch (_) {
    return "DEMO_KEY";
  }
}

export function setStoredApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem("nasa_api_key", key.trim());
    } else {
      localStorage.removeItem("nasa_api_key");
    }
  } catch (_) {}
}

/**
 * Fetches JSON with automatic caching, timeout, and signal cancellation.
 * 
 * @param {string} cacheKey - Unique key for caching.
 * @param {string} url - Target URL.
 * @param {Object} [options]
 * @param {number} [options.ttlMs] - Cache time-to-live in ms (default 24h).
 * @param {boolean} [options.forceRefresh] - Skip reading from cache.
 * @param {AbortSignal} [options.signal] - External abort signal.
 * @param {number} [options.timeoutMs] - Request timeout.
 * @returns {Promise<{data: any, fromCache: boolean, timestamp: number}>}
 */
export async function fetchWithCache(cacheKey, url, options = {}) {
  const ttlMs = options.ttlMs || 24 * 3600 * 1000;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const forceRefresh = Boolean(options.forceRefresh);

  // Check cache
  if (!forceRefresh && cacheKey) {
    try {
      const raw = localStorage.getItem(`ow_cache_${cacheKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < ttlMs && parsed.data !== undefined) {
          return { data: parsed.data, fromCache: true, timestamp: parsed.timestamp };
        }
      }
    } catch (_) {}
  }

  // Set up cancellation and timeout
  const internalController = new AbortController();
  const timeoutId = setTimeout(() => internalController.abort(), timeoutMs);

  // Link external signal if provided
  if (options.signal) {
    options.signal.addEventListener("abort", () => internalController.abort());
  }

  try {
    const res = await fetch(url, { signal: internalController.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const timestamp = Date.now();

    // Cache result
    if (cacheKey) {
      try {
        // Enforce quota hygiene by dropping older caches if storage is low
        localStorage.setItem(`ow_cache_${cacheKey}`, JSON.stringify({ data, timestamp }));
      } catch (e) {
        cleanOldCaches();
        try {
          localStorage.setItem(`ow_cache_${cacheKey}`, JSON.stringify({ data, timestamp }));
        } catch (_) {}
      }
    }

    return { data, fromCache: false, timestamp };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Clean old caches to prevent localStorage quota exhaustion.
 */
export function cleanOldCaches() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("ow_cache_") || k.startsWith("tle-"));
    // Keep newest 10 keys
    if (keys.length > 10) {
      keys.slice(0, keys.length - 10).forEach((k) => localStorage.removeItem(k));
    }
  } catch (_) {}
}

