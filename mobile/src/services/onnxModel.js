/**
 * onnxModel.js — Fully offline on-device plant disease inference
 * using ONNX Runtime + MobileNetV2 model (linkanjarad, 8.8 MB).
 *
 * Pipeline:
 *   1. Copy .onnx file from APK assets → documentDirectory
 *   2. Initialize InferenceSession (C++ ONNX Runtime)
 *   3. Preprocess image: resize → JPEG decode → Float32 NCHW tensor
 *   4. Run inference, softmax, return top-3 predictions
 */

// Lazy-loaded to avoid JSI boot crashes in dev mode
let InferenceSession = null;
let Tensor = null;
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';
import { Buffer } from 'buffer';

// ── Module state ────────────────────────────────────────────────────
let _session  = null;
let _labels   = [];
let _isReady  = false;
let _initPromise = null; // prevent concurrent init calls

// ── Constants ───────────────────────────────────────────────────────
const IMG_SIZE = 224;
// MobileNetV2 (Google/TF-style) normalization: pixel range [-1, 1]
const MEAN = [0.5, 0.5, 0.5];
const STD  = [0.5, 0.5, 0.5];

// ── Helpers ─────────────────────────────────────────────────────────
function softmax(arr) {
  const max = Math.max(...arr);
  const exp = arr.map(x => Math.exp(x - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(x => x / sum);
}

// ── Initialisation ───────────────────────────────────────────────────
/**
 * Call once at app startup (e.g. in useFocusEffect).
 * Safe to call multiple times — will only init once.
 */
export async function initOfflineModel() {
  if (_isReady && _session) return true;

  // Prevent multiple concurrent calls from racing
  if (_initPromise) return _initPromise;

  _initPromise = _doInit();
  const result = await _initPromise;
  _initPromise = null;
  return result;
}

async function _doInit() {
  try {
    console.log('[ONNX] Starting model initialization…');

    // 0 — Lazy load ONNX modules to avoid top-level JSI race conditions
    if (!InferenceSession) {
      const ort = require('onnxruntime-react-native');
      InferenceSession = ort.InferenceSession;
      Tensor = ort.Tensor;
    }

    // 1 — Load labels directly (RN parses JSON require() automatically)
    _labels = require('../../assets/models/plant_labels.json');
    console.log(`[ONNX] Loaded ${_labels.length} class labels`);

    // 2 — Resolve the MobileNetV2 .onnx asset (single file, no .data sidecar)
    const onnxAsset = Asset.fromModule(require('../../assets/models/plant_disease_mobilenet.onnx'));

    await onnxAsset.downloadAsync();

    const srcOnnx = onnxAsset.localUri || onnxAsset.uri;

    if (!srcOnnx) {
      throw new Error('Asset URI is null — plant_disease_mobilenet.onnx missing from bundle');
    }

    // 3 — Copy to writable document directory
    const ortDir   = FileSystem.documentDirectory + 'ort_models/';
    const destOnnx = ortDir + 'plant_disease_mobilenet.onnx';

    await FileSystem.makeDirectoryAsync(ortDir, { intermediates: true });

    const onnxInfo = await FileSystem.getInfoAsync(destOnnx);
    if (!onnxInfo.exists) {
      console.log('[ONNX] Copying plant_disease_mobilenet.onnx to document directory...');
      await FileSystem.copyAsync({ from: srcOnnx, to: destOnnx });
    }

    // 4 — Create the inference session
    console.log('[ONNX] Creating InferenceSession...');
    _session  = await InferenceSession.create(destOnnx);
    _isReady  = true;

    console.log('[ONNX] Model ready! Input:', _session.inputNames, '| Output:', _session.outputNames);
    return true;

  } catch (err) {
    console.error('[ONNX] Init failed:', err?.message || err);
    _session  = null;
    _isReady  = false;
    return false;
  }
}

// ── Image Preprocessing ──────────────────────────────────────────────
/**
 * Resize image to 224×224 JPEG, decode pixels, and normalise into
 * a Float32Array laid out as NCHW [1, 3, 224, 224].
 */
async function preprocessImage(imageUri) {
  // Resize using expo-image-manipulator (v14 API)
  const manipResult = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: IMG_SIZE, height: IMG_SIZE } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.95, base64: true }
  );

  if (!manipResult.base64) {
    throw new Error('Image manipulation returned no base64 data');
  }

  // Decode JPEG → raw RGBA Uint8Array
  const imgBuffer    = Buffer.from(manipResult.base64, 'base64');
  const rawImageData = jpeg.decode(imgBuffer, { useTArray: true });

  if (!rawImageData || !rawImageData.data) {
    throw new Error('JPEG decode failed — corrupted image data');
  }

  // Build NCHW Float32 tensor with ImageNet normalisation
  const pixels     = rawImageData.data;  // RGBA flat array
  const numPixels  = IMG_SIZE * IMG_SIZE;
  const float32    = new Float32Array(3 * numPixels);

  for (let i = 0; i < numPixels; i++) {
    const base = i * 4; // RGBA stride
    float32[0 * numPixels + i] = (pixels[base]     / 255 - MEAN[0]) / STD[0]; // R
    float32[1 * numPixels + i] = (pixels[base + 1] / 255 - MEAN[1]) / STD[1]; // G
    float32[2 * numPixels + i] = (pixels[base + 2] / 255 - MEAN[2]) / STD[2]; // B
  }

  return float32;
}

// ── Inference ────────────────────────────────────────────────────────
/**
 * Run inference on a local image URI.
 * Returns { ok, predictions, inference_ms }
 */
export async function runInference(imageUri) {
  // Lazy-init if not ready
  if (!_isReady || !_session) {
    const ok = await initOfflineModel();
    if (!ok) throw new Error('Offline model could not be initialised. Check that model files are bundled correctly.');
  }

  const t0 = Date.now();

  try {
    // 1 — Preprocess
    const inputData = await preprocessImage(imageUri);

    // 2 — Build tensor  [batch=1, channels=3, H=224, W=224]
    const inputTensor = new Tensor('float32', inputData, [1, 3, IMG_SIZE, IMG_SIZE]);

    // 3 — Run
    const inputName = _session.inputNames[0];
    const feeds     = { [inputName]: inputTensor };
    const results   = await _session.run(feeds);

    // 4 — Decode output
    const outputName = _session.outputNames[0];
    const logits     = Array.from(results[outputName].data);
    const probs      = softmax(logits);

    const inferenceMs = Date.now() - t0;

    // Top-5 predictions
    const top5 = probs
      .map((p, i) => ({ confidence: p, disease: _labels[i] || `Class_${i}` }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    console.log(`[ONNX] ✅ Inference done in ${inferenceMs}ms | Top: ${top5[0].disease} (${(top5[0].confidence * 100).toFixed(1)}%)`);

    return {
      ok: true,
      predictions: top5.map(p => ({
        disease:    p.disease,
        confidence: parseFloat(p.confidence.toFixed(4)),
      })),
      inference_ms: inferenceMs,
    };

  } catch (err) {
    console.error('[ONNX] Inference error:', err?.message || err);
    throw err;
  }
}

// ── Analysis Payload Builder ─────────────────────────────────────────
const DISEASE_KNOWLEDGE = {
  // Apple
  'Apple with Apple Scab':           { treatment: ['Apply captan or myclobutanil fungicide', 'Prune for air circulation'], prevention: ['Rake and destroy fallen leaves', 'Use resistant apple varieties'] },
  'Apple with Black Rot':            { treatment: ['Remove mummified fruit and cankers', 'Apply copper fungicide'], prevention: ['Prune properly to remove dead wood', 'Clean orchard floor of debris'] },
  'Apple with Cedar Apple Rust':     { treatment: ['Apply myclobutanil or propiconazole in spring', 'Remove nearby cedar galls'], prevention: ['Plant rust-resistant apple varieties', 'Remove nearby juniper/cedar host plants'] },
  // Cherry
  'Cherry with Powdery Mildew':      { treatment: ['Apply sulfur or potassium bicarbonate spray', 'Remove affected tissue'], prevention: ['Avoid excessive nitrogen fertiliser', 'Prune to improve air circulation'] },
  // Corn
  'Corn with Gray Leaf Spot':        { treatment: ['Apply strobilurin or triazole fungicide', 'Improve field air circulation'], prevention: ['Rotate crops — avoid consecutive corn planting', 'Use resistant hybrids'] },
  'Corn with Common Rust':           { treatment: ['Apply propiconazole or azoxystrobin at early sign', 'Remove heavily infected leaves'], prevention: ['Plant rust-resistant hybrid varieties', 'Scout fields regularly from silking stage'] },
  'Corn with Northern Leaf Blight':  { treatment: ['Apply fungicide at tasseling stage', 'Remove infected tissue'], prevention: ['Use resistant hybrids', 'Crop rotation with non-host crops'] },
  // Grape
  'Grape with Black Rot':            { treatment: ['Apply mancozeb or myclobutanil', 'Remove and destroy mummified berries'], prevention: ['Improve canopy airflow via pruning', 'Early-season fungicide program'] },
  'Grape with Esca (Black Measles)': { treatment: ['Prune infected wood', 'Apply wound sealant after pruning'], prevention: ['Avoid large pruning wounds', 'Use clean, disinfected pruning tools'] },
  'Grape with Leaf Blight':          { treatment: ['Apply copper-based fungicide', 'Remove infected leaves'], prevention: ['Good air circulation in canopy', 'Avoid overhead irrigation'] },
  // Orange
  'Orange with Citrus Greening':     { treatment: ['Remove and destroy infected trees immediately', 'Control Asian citrus psyllid vector'], prevention: ['Use certified disease-free planting material', 'Regular psyllid monitoring and control'] },
  // Peach
  'Peach with Bacterial Spot':       { treatment: ['Apply copper bactericide sprays', 'Avoid wounding the fruit'], prevention: ['Use resistant varieties', 'Avoid overhead irrigation'] },
  // Bell Pepper
  'Bell Pepper with Bacterial Spot': { treatment: ['Apply copper-based bactericide', 'Remove infected leaves promptly'], prevention: ['Use certified disease-free seed', 'Avoid working in field when plants are wet'] },
  // Potato
  'Potato with Early Blight':        { treatment: ['Apply chlorothalonil or mancozeb fungicide', 'Remove and destroy infected lower leaves'], prevention: ['Maintain adequate plant spacing', 'Ensure balanced nitrogen fertilisation'] },
  'Potato with Late Blight':         { treatment: ['Apply metalaxyl or cymoxanil fungicide urgently — spreads very fast', 'Destroy all infected tubers and foliage'], prevention: ['Plant certified disease-free seed potatoes', 'Avoid overhead irrigation; water at the base'] },
  // Squash
  'Squash with Powdery Mildew':      { treatment: ['Apply potassium bicarbonate or neem oil spray'], prevention: ['Space plants widely for airflow', 'Water at the base, not overhead'] },
  // Strawberry
  'Strawberry with Leaf Scorch':     { treatment: ['Apply fungicide (captan or myclobutanil)', 'Remove infected leaves'], prevention: ['Avoid overhead watering', 'Ensure good soil drainage'] },
  // Tomato
  'Tomato with Bacterial Spot':      { treatment: ['Apply copper-based bactericide', 'Remove infected leaves and fruit'], prevention: ['Use disease-free certified seeds', 'Avoid overhead irrigation'] },
  'Tomato with Early Blight':        { treatment: ['Apply chlorothalonil or mancozeb fungicide', 'Remove affected lower foliage'], prevention: ['Crop rotation (avoid same-family plants)', 'Mulch soil to prevent splash'] },
  'Tomato with Late Blight':         { treatment: ['Apply mefenoxam or metalaxyl fungicide urgently', 'Remove and destroy infected plants'], prevention: ['Use resistant varieties', 'Monitor weather — disease thrives in cool, wet conditions'] },
  'Tomato with Leaf Mold':           { treatment: ['Improve greenhouse ventilation', 'Apply fungicide (chlorothalonil)'], prevention: ['Reduce humidity below 85%', 'Grow in well-ventilated spaces'] },
  'Tomato with Septoria Leaf Spot':  { treatment: ['Apply chlorothalonil fungicide', 'Remove infected lower leaves immediately'], prevention: ['Crop rotation', 'Stake and prune plants for better airflow'] },
  'Tomato with Spider Mites':        { treatment: ['Apply miticide or neem oil spray', 'Spray with strong water stream to dislodge mites'], prevention: ['Maintain field humidity', 'Avoid plant drought stress'] },
  'Tomato with Target Spot':         { treatment: ['Apply fungicide (azoxystrobin) at first sign', 'Remove infected tissue'], prevention: ['Avoid dense planting', 'Crop rotation with non-host crops'] },
  'Tomato Yellow Leaf Curl Virus':   { treatment: ['Remove and destroy infected plants immediately', 'Control whitefly population with insecticide'], prevention: ['Use virus-resistant tomato varieties', 'Install fine insect-proof netting'] },
  'Tomato Mosaic Virus':             { treatment: ['Remove and destroy all infected plants', 'Disinfect tools with bleach solution'], prevention: ['Use certified virus-free seeds', 'Control aphid vectors'] },
};

const DEFAULT_KNOWLEDGE = {
  treatment:  ['Consult a local agricultural extension officer', 'Monitor plant closely for spread of symptoms'],
  prevention: ['Maintain good field hygiene and cultural practices', 'Regularly inspect plants for early symptoms'],
};

export function buildAnalysisPayload(onnxResult) {
  const top       = onnxResult.predictions[0];
  const label     = top.disease || '';
  const isHealthy = label.toLowerCase().startsWith('healthy');
  const isInvalid = label.toLowerCase().includes('invalid') || label.toLowerCase().startsWith('class_');
  const pct       = Math.round(top.confidence * 100);

  // Handle unrecognised class index or very low confidence
  // Threshold is intentionally high (60%) because this model has a strong
  // tomato-class bias — below 60% the result is likely wrong.
  const isTomatoBiased = label.toLowerCase().startsWith('tomato') && pct < 75;

  if (isInvalid || pct < 60 || isTomatoBiased) {
    return {
      crop:       'Unclear',
      disease:    'Could not identify with confidence',
      confidence: 'Low',
      reasoning:  `Model confidence is ${pct}% — too low for a reliable result. For best results:\n• Use a clear, close-up photo of a single leaf\n• Good natural lighting (no shadows)\n• Hold the camera steady\n• Supported crops: Tomato, Potato, Corn, Apple, Grape, Bell Pepper and more.`,
      symptoms:   ['Image unclear, or disease pattern does not match training data'],
      causes:     ['N/A'],
      treatment:  ['Take a clearer close-up photo of one affected leaf', 'Try the AI Scan mode when connected to internet for better accuracy'],
      prevention: ['Use Quick Scan only for supported crops with clear, well-lit photos'],
      offlineMode:        true,
      modelConfidencePct: pct,
      topLabel:           label,
      allPredictions:     onnxResult.predictions.map(p => ({ label: p.disease, confidence: Math.round(p.confidence * 100) })),
      inferenceMs:        onnxResult.inference_ms,
    };
  }


  let crop    = 'Unknown';
  let disease = 'Unknown';

  if (isHealthy) {
    disease = 'No Disease Detected';
    crop    = label.replace(/^healthy\s*/i, '').replace(/\s*plant$/i, '').trim() || 'Plant';
  } else {
    const withIdx = label.toLowerCase().indexOf(' with ');
    if (withIdx !== -1) {
      crop    = label.slice(0, withIdx).trim();
      disease = label.slice(withIdx + 6).trim();
    } else {
      // Handle "Tomato Yellow Leaf Curl Virus" / "Tomato Mosaic Virus" style
      const parts = label.split(' ');
      crop    = parts[0];
      disease = parts.slice(1).join(' ');
    }
  }

  const confidenceLabel = pct >= 75 ? 'High' : pct >= 50 ? 'Medium' : 'Low';
  const knowledge       = DISEASE_KNOWLEDGE[label] || DEFAULT_KNOWLEDGE;

  return {
    crop,
    disease,
    confidence: confidenceLabel,
    reasoning:  isHealthy
      ? `The ${crop} plant appears healthy with ${pct}% confidence. No significant disease symptoms detected by the on-device model.`
      : `${disease} detected on ${crop} with ${pct}% confidence (${confidenceLabel}). Powered by on-device ONNX ViT model — works completely offline.`,
    symptoms:   isHealthy ? ['Plant appears healthy — no visible disease symptoms'] : [`${disease} symptoms visible on ${crop} leaves`],
    causes:     isHealthy ? ['N/A'] : ['Fungal, bacterial, or viral pathogen aggravated by weather conditions'],
    treatment:  knowledge.treatment,
    prevention: knowledge.prevention,
    offlineMode:        true,
    modelConfidencePct: pct,
    topLabel:           label,
    allPredictions:     onnxResult.predictions.map(p => ({
      label:      p.disease,
      confidence: Math.round(p.confidence * 100),
    })),
    inferenceMs: onnxResult.inference_ms,
  };
}
