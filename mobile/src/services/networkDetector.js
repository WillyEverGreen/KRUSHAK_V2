/**
 * networkDetector.js
 * Lightweight connectivity checker that pings the server.
 * Does NOT require @react-native-community/netinfo (avoids native modules).
 * Uses a simple fetch() against a known fast endpoint.
 */

import { http } from './http';

let _isOnline = true;                    // cached last known state
let _checkInProgress = false;
let _listeners = new Set();
let _intervalId = null;

const PING_TIMEOUT_MS = 4000;

/** Subscribe to online/offline changes. Returns unsubscribe fn. */
export function onConnectivityChange(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function _notify(online) {
  if (online !== _isOnline) {
    _isOnline = online;
    _listeners.forEach(cb => cb(online));
  }
}

/** Actively check connectivity by hitting the server health endpoint */
export async function checkConnectivity() {
  if (_checkInProgress) return _isOnline;
  _checkInProgress = true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    await http.get('/health', { signal: controller.signal, timeout: PING_TIMEOUT_MS });
    clearTimeout(timer);
    _notify(true);
    return true;
  } catch {
    _notify(false);
    return false;
  } finally {
    _checkInProgress = false;
  }
}

/** Returns last known connectivity state (no network request) */
export function isOnline() {
  return _isOnline;
}

/** Start polling connectivity every N seconds */
export function startPolling(intervalMs = 15000) {
  if (_intervalId) return;
  checkConnectivity(); // immediate check on start
  _intervalId = setInterval(checkConnectivity, intervalMs);
}

/** Stop polling */
export function stopPolling() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}
