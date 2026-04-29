/**
 * Offline cache backed by AsyncStorage-style in-memory map + JSON stringify.
 * For production, wire this into expo-sqlite or AsyncStorage.
 */
const memCache = {};

export async function withOfflineFallback(key, fetchFn) {
  try {
    const result = await fetchFn();
    memCache[key] = { data: result, ts: Date.now() };
    return result;
  } catch (err) {
    if (memCache[key]) {
      return { ...memCache[key].data, _stale: true, _cachedAt: memCache[key].ts };
    }
    throw err;
  }
}

export function clearCache(key) {
  if (key) delete memCache[key];
  else Object.keys(memCache).forEach((k) => delete memCache[k]);
}
