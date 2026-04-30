const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add binary model files to assetExts so Metro bundles them as raw files.
config.resolver.assetExts.push('onnx', 'data');

/**
 * Permanent fix for llama.rn's "Cannot read property 'install' of null" crash.
 *
 * Intercepts ./NativeRNLlama inside llama.rn at resolver level.
 * Works before Metro's transform cache, survives all reinstalls.
 * Uses forward-slash normalized comparison to handle Windows paths.
 */
const NATIVE_STUB = path.resolve(__dirname, 'src', 'native-stubs', 'NativeRNLlama.js');

// Normalize to forward slashes so Windows path comparison works
const normalize = (p) => p.replace(/\\/g, '/').toLowerCase();
const LLAMA_RN_NORM = normalize(
  path.resolve(__dirname, 'node_modules', 'llama.rn')
);

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  Metro resolver patch for llama.rn ACTIVE               ║');
console.log(`║  Stub: ${NATIVE_STUB.slice(-50).padStart(50)} ║`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const originNorm = normalize(context.originModulePath || '');

  // Debug: log all llama.rn-related resolutions
  if (originNorm.includes('/llama.rn/') || moduleName.includes('llama') || moduleName.includes('NativeRNLlama')) {
    console.log(`[Metro Resolver] origin=${originNorm.split('/llama.rn/')[1] || originNorm.slice(-60)}`);
    console.log(`[Metro Resolver] moduleName="${moduleName}"`);
  }

  // Intercept NativeRNLlama from within llama.rn
  if (
    (moduleName === './NativeRNLlama' || moduleName.endsWith('/NativeRNLlama')) &&
    originNorm.includes('/node_modules/llama.rn/')
  ) {
    console.log(`\n✅ [Metro Resolver] INTERCEPTED NativeRNLlama → using safe stub\n`);
    return { filePath: NATIVE_STUB, type: 'sourceFile' };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
