/**
 * NativeRNLlama.js — Metro safe stub
 * Loaded via metro.config.js resolveRequest interceptor.
 * Provides a null-safe fallback for TurboModuleRegistry.get('RNLlama').
 */

'use strict';

// ⚠️  This log appears in Metro terminal when the stub is loaded.
// If you see it → the resolver is working. If not → resolver not firing.
console.log('[NativeRNLlama STUB] Loading safe stub — TurboModule null-guard active');

const { TurboModuleRegistry } = require('react-native');

let nativeModule = null;
try {
  nativeModule = TurboModuleRegistry.get('RNLlama');
  if (nativeModule) {
    console.log('[NativeRNLlama STUB] ✅ RNLlama native module found — using real module');
  } else {
    console.warn('[NativeRNLlama STUB] ⚠️  RNLlama is null — using no-op fallback (normal in dev)');
  }
} catch (e) {
  console.warn('[NativeRNLlama STUB] ⚠️  TurboModuleRegistry threw:', e?.message);
}

const fallback = {
  install: function () {
    console.log('[NativeRNLlama STUB] install() called with fallback — returning false');
    return Promise.resolve(false);
  },
};

module.exports = {
  __esModule: true,
  default: nativeModule || fallback,
};
