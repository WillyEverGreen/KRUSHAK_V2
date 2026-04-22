const CACHE_PREFIX = "krushak_cache_";

export function readCache(key) {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCache(key, value) {
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore quota and JSON errors for best-effort offline cache.
  }
}

export async function withOfflineFallback(key, requestFn) {
  try {
    const fresh = await requestFn();
    writeCache(key, fresh);
    return fresh;
  } catch (error) {
    const cached = readCache(key);
    if (cached) return cached;
    throw error;
  }
}
