/**
 * llmService.js — On-device Qwen2.5-1.5B-Instruct inference via llama.rn
 *
 * Model: Qwen2.5-1.5B-Instruct-Q4_K_M.gguf (~990 MB)
 * Source: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF
 *
 * Usage:
 *   import * as LLM from '../services/llmService';
 *   await LLM.downloadModelIfNeeded(setProgress);
 *   await LLM.initModel();
 *   await LLM.chat([{ role: 'user', content: 'Hello!' }], token => setReply(r => r + token));
 */

import * as FileSystem from 'expo-file-system/legacy';

// ── Config ──────────────────────────────────────────────────────────────────────────────
const MODEL_FILENAME = 'qwen2.5-1.5b-q4_k_m.gguf';
const MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf';

// Computed lazily to avoid module-level native access before runtime is ready
const getModelDir  = () => (FileSystem.documentDirectory || '') + 'krushak_models/';
const getModelPath = () => getModelDir() + MODEL_FILENAME;

// Context length — 2048 is safe for most phones
const N_CTX = 2048;

// Qwen stop tokens
const STOP_WORDS = ['<|im_end|>', '<|endoftext|>', '</s>'];

// Agriculture-focused system prompt in English + Hindi
const SYSTEM_PROMPT = `You are Krushak AI, an expert agricultural assistant for Indian farmers. 
You help with:
- Crop disease diagnosis and treatment
- Fertilizer and irrigation advice
- Pest control and prevention
- Market and weather guidance
- Livestock care

Keep answers concise, practical, and farmer-friendly. Use simple language.
If asked in Hindi, respond in Hindi. Default to English otherwise.
Always prioritize organic and affordable solutions for small farmers.`;

// ── Module state ────────────────────────────────────────────────────────────
let _context   = null;
let _isReady   = false;
let _isLoading = false;

// ── Download ─────────────────────────────────────────────────────────────────
/**
 * Check if model file is already downloaded
 */
export async function isModelDownloaded() {
  try {
    const modelPath = getModelPath();
    const info = await FileSystem.getInfoAsync(modelPath);
    return info.exists && (info.size || 0) > 900 * 1024 * 1024;
  } catch {
    return false;
  }
}

/**
 * Download model with progress callback.
 * @param {function} onProgress - Called with { bytesDownloaded, totalBytes, percent }
 * @param {function} onError    - Called with error message string
 * @returns {Promise<boolean>}  - true if successful
 */
export async function downloadModelIfNeeded(onProgress, onError) {
  const alreadyDownloaded = await isModelDownloaded();
  if (alreadyDownloaded) return true;

  const modelDir  = getModelDir();
  const modelPath = getModelPath();

  try {
    await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });

    const downloadResumable = FileSystem.createDownloadResumable(
      MODEL_URL,
      modelPath,
      {},
      (downloadProgress) => {
        const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
        const percent = totalBytesExpectedToWrite > 0
          ? Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
          : 0;
        onProgress?.({
          bytesDownloaded: totalBytesWritten,
          totalBytes: totalBytesExpectedToWrite,
          percent,
        });
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) throw new Error('Download returned no URI');

    const valid = await isModelDownloaded();
    if (!valid) throw new Error('Downloaded file appears incomplete');

    return true;
  } catch (err) {
    try { await FileSystem.deleteAsync(modelPath, { idempotent: true }); } catch {}
    onError?.(err.message || 'Download failed');
    return false;
  }
}

/**
 * Delete model file (to re-download or free space)
 */
export async function deleteModel() {
  try {
    await FileSystem.deleteAsync(getModelPath(), { idempotent: true });
    _context  = null;
    _isReady  = false;
    _isLoading = false;
  } catch {}
}

// ── Initialisation ────────────────────────────────────────────────────────────
/**
 * Load the model into llama.rn context.
 * Safe to call multiple times — only initialises once per session.
 * Takes ~10-30 sec on first call.
 */
export async function initModel() {
  if (_isReady && _context) return true;
  if (_isLoading) {
    while (_isLoading) await sleep(200);
    return _isReady;
  }

  const downloaded = await isModelDownloaded();
  if (!downloaded) return false;

  _isLoading = true;
  try {
    // Lazy-require llama.rn so TurboModuleRegistry is only accessed after runtime
    // is fully initialized (avoids 'install of null' crash on fast-refresh)
    let initLlama;
    try {
      initLlama = require('llama.rn').initLlama;
    } catch (e) {
      console.error('[LLM] llama.rn not available:', e?.message);
      _isLoading = false;
      return false;
    }

    if (!initLlama) {
      console.error('[LLM] initLlama is undefined — native module may not be linked');
      _isLoading = false;
      return false;
    }

    console.log('[LLM] Initialising Qwen2.5-1.5B context…');

    _context = await initLlama({
      model: getModelPath(),
      use_mlock: true,
      n_ctx: N_CTX,
      n_gpu_layers: 0,
      n_threads: 4,
    });

    _isReady  = true;
    _isLoading = false;
    console.log('[LLM] ✅ Qwen2.5-1.5B ready!');
    return true;
  } catch (err) {
    console.error('[LLM] ❌ Init failed:', err?.message || err);
    _context  = null;
    _isReady  = false;
    _isLoading = false;
    return false;
  }
}

export const isModelReady = () => _isReady && _context !== null;

// ── Chat ──────────────────────────────────────────────────────────────────────
/**
 * Run a streaming chat completion.
 *
 * @param {Array<{role: string, content: string}>} messages
 *   Conversation history, e.g. [{ role: 'user', content: 'Hello' }]
 * @param {function} onToken
 *   Called for each streamed token string, e.g. token => setReply(r => r + token)
 * @param {object} options
 *   Optional: { maxTokens: 512, temperature: 0.7 }
 * @returns {Promise<string>}  Full response text
 */
export async function chat(messages, onToken, options = {}) {
  if (!_isReady || !_context) {
    const ok = await initModel();
    if (!ok) throw new Error('LLM not ready — model may not be downloaded');
  }

  const fullMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  let fullText = '';

  const result = await _context.completion(
    {
      messages: fullMessages,
      n_predict: options.maxTokens || 512,
      temperature: options.temperature ?? 0.7,
      top_p: 0.9,
      stop: STOP_WORDS,
    },
    (data) => {
      // Streaming callback — called for every token
      const token = data.token || '';
      fullText += token;
      onToken?.(token);
    }
  );

  return result?.text || fullText;
}

/**
 * Single-shot completion (no streaming) — useful for diagnosis reasoning.
 * @param {string} prompt  Raw prompt text
 * @param {object} options { maxTokens, temperature }
 */
export async function complete(prompt, options = {}) {
  if (!_isReady || !_context) {
    const ok = await initModel();
    if (!ok) throw new Error('LLM not ready');
  }

  const result = await _context.completion({
    prompt,
    n_predict: options.maxTokens || 256,
    temperature: options.temperature ?? 0.5,
    stop: STOP_WORDS,
  });

  return result?.text || '';
}

/**
 * Free the model context (call when navigating away to save RAM).
 * Model will auto-reinit on next chat() call.
 */
export async function releaseModel() {
  if (_context) {
    try { await _context.release(); } catch {}
    _context  = null;
    _isReady  = false;
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const MODEL_SIZE_MB = 990;
export { MODEL_FILENAME };
export const MODEL_PATH = getModelPath;
