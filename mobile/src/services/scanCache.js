/**
 * scanCache.js
 * AsyncStorage-based cache for diagnosis results.
 * Provides true offline access to the last N scans.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'krushak_scan_cache';
const MAX_CACHED = 10;

/**
 * Save a new scan result to cache.
 * @param {{ imageUri: string, analysis: object, mode: 'ai'|'quick', timestamp: number }} entry
 */
export async function cacheScanResult(entry) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    // Prepend new, trim to MAX_CACHED
    const updated = [entry, ...existing].slice(0, MAX_CACHED);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[scanCache] Failed to cache result:', e.message);
  }
}

/**
 * Get all cached scan results, newest first.
 * @returns {Promise<Array>}
 */
export async function getCachedScans() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all cached scans.
 */
export async function clearScanCache() {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {}
}
