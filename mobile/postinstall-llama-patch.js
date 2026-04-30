/**
 * postinstall-llama-patch.js
 * Patches llama.rn's NativeRNLlama to prevent 'install of null' crash
 * when TurboModuleRegistry.get() returns null during Metro fast-refresh.
 * 
 * Run automatically via: "postinstall": "node postinstall-llama-patch.js"
 */

const fs = require('fs');
const path = require('path');

const files = [
  {
    path: path.join(__dirname, 'node_modules', 'llama.rn', 'lib', 'commonjs', 'NativeRNLlama.js'),
    search: `var _default = exports.default = _reactNative.TurboModuleRegistry.get('RNLlama');`,
    replace: `// Patched: null-safe fallback to prevent 'install of null' crash
var _nativeModule = null;
try { _nativeModule = _reactNative.TurboModuleRegistry.get('RNLlama'); } catch (e) {}
var _default = exports.default = _nativeModule || { install: function() { return Promise.resolve(false); } };`,
  },
  {
    path: path.join(__dirname, 'node_modules', 'llama.rn', 'lib', 'module', 'NativeRNLlama.js'),
    search: `export default TurboModuleRegistry.get('RNLlama');`,
    replace: `// Patched: null-safe fallback
let nativeModule = null;
try { nativeModule = TurboModuleRegistry.get('RNLlama'); } catch (e) {}
export default nativeModule || { install: function() { return Promise.resolve(false); } };`,
  },
  {
    path: path.join(__dirname, 'node_modules', 'llama.rn', 'src', 'NativeRNLlama.ts'),
    search: `export default TurboModuleRegistry.get<Spec>('RNLlama') as Spec`,
    replace: `// Patched: null-safe fallback
let nativeModule: Spec | null = null;
try { nativeModule = TurboModuleRegistry.get<Spec>('RNLlama'); } catch (e) {}
export default nativeModule || ({ install: () => Promise.resolve(false) } as Spec)`,
  },
  // ── onnxruntime-react-native: binding.js calls Module.install() at module load time
  // without checking if Module (NativeModules.Onnxruntime) is null. This crashes
  // during [runtime not ready] phase in dev mode.
  {
    path: path.join(__dirname, 'node_modules', 'onnxruntime-react-native', 'dist', 'commonjs', 'binding.js'),
    search: `if (typeof globalThis.OrtApi === 'undefined') {\n  Module.install();`,
    replace: `// Patched: guard against null during [runtime not ready] phase\nif (Module && typeof globalThis.OrtApi === 'undefined') {\n  Module.install();`,
  },
  {
    path: path.join(__dirname, 'node_modules', 'onnxruntime-react-native', 'dist', 'module', 'binding.js'),
    search: `if (typeof globalThis.OrtApi === 'undefined') {\n  Module.install();`,
    replace: `// Patched: guard against null during [runtime not ready] phase\nif (Module && typeof globalThis.OrtApi === 'undefined') {\n  Module.install();`,
  },
  {
    path: path.join(__dirname, 'node_modules', 'react-native-gesture-handler', 'lib', 'commonjs', 'init.js'),
    search: `require("./RNGestureHandlerModule").default.install();`,
    replace: `try { require("./RNGestureHandlerModule").default.install(); } catch (e) {}`,
  },
  {
    path: path.join(__dirname, 'node_modules', 'react-native-gesture-handler', 'lib', 'module', 'init.js'),
    search: `import RNGestureHandlerModule from './RNGestureHandlerModule';\nRNGestureHandlerModule.install();`,
    replace: `import RNGestureHandlerModule from './RNGestureHandlerModule';\ntry { RNGestureHandlerModule.install(); } catch (e) {}`,
  },
  {
    path: path.join(__dirname, 'node_modules', 'react-native-gesture-handler', 'src', 'init.ts'),
    search: `import RNGestureHandlerModule from './RNGestureHandlerModule';\nRNGestureHandlerModule.install();`,
    replace: `import RNGestureHandlerModule from './RNGestureHandlerModule';\ntry { RNGestureHandlerModule.install(); } catch (e) {}`,
  },
];

let patchCount = 0;
files.forEach(({ path: filePath, search, replace }) => {
  try {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(search)) {
      content = content.replace(search, replace);
      fs.writeFileSync(filePath, content, 'utf8');
      patchCount++;
      console.log(`✅ Patched: ${path.basename(filePath)}`);
    } else if (content.includes('null-safe')) {
      console.log(`⏭️  Already patched: ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.warn(`⚠️  Could not patch ${path.basename(filePath)}:`, err.message);
  }
});

if (patchCount > 0) {
  console.log(`\n🔧 llama.rn patched (${patchCount} files) — 'install of null' crash prevented.`);
}

// --- FIX EXPO AUTOLINKING BUG FOR ONNXRUNTIME ---
// onnxruntime-react-native contains a legacy 'unimodule.json' file.
// In modern Expo apps, this causes Expo's autolinker to hijack the module 
// but fail to link it to the standard React Native PackageList.java.
// Deleting this file forces the standard React Native CLI to autolink it properly.
const unimodulePath = path.join(__dirname, 'node_modules', 'onnxruntime-react-native', 'unimodule.json');
if (fs.existsSync(unimodulePath)) {
  try {
    fs.unlinkSync(unimodulePath);
    console.log( + "" + \u2705 [Postinstall] Deleted legacy unimodule.json to fix Expo autolinking + "" + );
  } catch (err) {
    console.error( + "" + \u274C [Postinstall] Failed to delete unimodule.json: + "" + , err);
  }
}
