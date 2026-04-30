import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'tflite_infer.py');

/* ── Disease knowledge base (maps model labels → treatment info) ──────── */
const DISEASE_INFO = {
  'Tomato Bacterial Spot':        { causes: ['Bacterial infection (Xanthomonas)', 'Splash irrigation', 'Infected seeds'], treatment: ['Apply copper-based bactericide', 'Remove infected leaves', 'Avoid overhead watering'], prevention: ['Use disease-free seeds', 'Crop rotation', 'Improve air circulation'], symptoms: ['Dark water-soaked spots on leaves', 'Yellow halo around lesions', 'Spots on fruit surface'] },
  'Tomato Early Blight':          { causes: ['Fungal (Alternaria solani)', 'Wet weather', 'Poor nutrition'], treatment: ['Apply chlorothalonil or mancozeb fungicide', 'Remove infected lower leaves', 'Mulch around base'], prevention: ['Avoid overhead irrigation', 'Stake plants for airflow', 'Balanced fertilization'], symptoms: ['Dark target-like rings on older leaves', 'Yellowing around lesions', 'Stem collar rot'] },
  'Tomato Late Blight':           { causes: ['Oomycete (Phytophthora infestans)', 'Cool wet weather', 'High humidity'], treatment: ['Apply metalaxyl or cymoxanil fungicide immediately', 'Remove & destroy infected parts', 'Improve drainage'], prevention: ['Resistant varieties', 'Avoid evening irrigation', 'Weekly preventive sprays in wet season'], symptoms: ['Dark water-soaked lesions', 'White fuzzy growth on undersides', 'Rapid wilting and death'] },
  'Tomato Leaf Mold':             { causes: ['Fungus (Passalora fulva)', 'High humidity in greenhouse', 'Poor ventilation'], treatment: ['Apply chlorothalonil or copper fungicide', 'Increase ventilation', 'Reduce humidity'], prevention: ['Resistant varieties', 'Prune for airflow', 'Avoid leaf wetness'], symptoms: ['Yellow patches on upper leaf surface', 'Olive-green mold on underside', 'Leaf drop'] },
  'Tomato Septoria Leaf Spot':    { causes: ['Fungus (Septoria lycopersici)', 'Wet humid weather', 'Infected soil debris'], treatment: ['Apply mancozeb fungicide', 'Remove infected leaves', 'Mulch soil surface'], prevention: ['Crop rotation', 'Avoid overhead watering', 'Remove plant debris'], symptoms: ['Small circular spots with dark border', 'Grey-white centers with dark specks', 'Starts on lower leaves'] },
  'Tomato Spider Mites':          { causes: ['Two-spotted mite (Tetranychus urticae)', 'Hot dry conditions', 'Dusty environment'], treatment: ['Apply acaricide (abamectin)', 'Neem oil spray', 'Increase humidity'], prevention: ['Regular water spraying', 'Avoid excessive nitrogen', 'Introduce predatory mites'], symptoms: ['Fine webbing on undersides', 'Stippled bronze-yellow leaves', 'Leaf drop in severe cases'] },
  'Tomato Target Spot':           { causes: ['Fungus (Corynespora cassiicola)', 'Warm humid weather', 'Dense canopy'], treatment: ['Apply azoxystrobin fungicide', 'Prune for airflow', 'Remove infected leaves'], prevention: ['Good spacing', 'Avoid overhead irrigation', 'Crop rotation'], symptoms: ['Brown circular spots with target rings', 'Yellow halo around spots', 'Affects leaves, stems and fruit'] },
  'Tomato Mosaic Virus':          { causes: ['Tobacco mosaic virus (TMV)', 'Aphid vectors', 'Infected tools or hands'], treatment: ['Remove and destroy infected plants', 'Control aphids with insecticide', 'No direct cure'], prevention: ['Resistant varieties', 'Wash hands and tools', 'Control aphid populations'], symptoms: ['Mottled yellow-green mosaic on leaves', 'Distorted leaf edges', 'Stunted growth'] },
  'Tomato Yellow Leaf Curl Virus':{ causes: ['Tomato yellow leaf curl virus (TYLCV)', 'Whitefly (Bemisia tabaci) vector', 'Warm dry conditions'], treatment: ['Remove infected plants', 'Control whitefly with imidacloprid', 'Use sticky traps'], prevention: ['Resistant varieties', 'Reflective mulch to repel whiteflies', 'Screen houses'], symptoms: ['Upward curling of leaves', 'Yellow leaf margins', 'Stunted plants, few fruits'] },
  'Pepper Bacterial Spot':        { causes: ['Xanthomonas bacteria', 'Warm wet conditions', 'Infected seeds'], treatment: ['Copper bactericide sprays', 'Remove infected plant parts', 'Avoid working when wet'], prevention: ['Certified disease-free seed', 'Crop rotation', 'Avoid overhead irrigation'], symptoms: ['Water-soaked spots turning dark', 'Raised scab-like spots on fruit', 'Defoliation in severe cases'] },
  'Potato Early Blight':          { causes: ['Alternaria solani fungus', 'Warm humid weather', 'Stressed plants'], treatment: ['Mancozeb or chlorothalonil fungicide', 'Remove infected foliage', 'Ensure adequate nutrition'], prevention: ['Certified seed potatoes', 'Balanced fertilization', 'Crop rotation'], symptoms: ['Dark brown target spots on older leaves', 'Yellow halo around spots', 'Premature defoliation'] },
  'Potato Late Blight':           { causes: ['Phytophthora infestans', 'Cool wet nights', 'High humidity'], treatment: ['Immediate metalaxyl/mancozeb application', 'Remove and destroy infected haulm', 'Avoid irrigation before rain'], prevention: ['Certified seed', 'Resistant varieties', 'Destroy volunteer plants'], symptoms: ['Dark water-soaked lesions on leaves', 'White sporulation on underside', 'Tuber rot with reddish-brown discolouration'] },
  'Corn Cercospora Leaf Spot':    { causes: ['Cercospora zeae-maydis fungus', 'High humidity', 'Reduced airflow'], treatment: ['Strobilurin fungicide', 'Remove crop debris', 'Ensure good drainage'], prevention: ['Resistant hybrids', 'Crop rotation', 'Deep tillage to bury debris'], symptoms: ['Rectangular grey-tan lesions parallel to leaf veins', 'Lesions have distinct margins', 'Premature drying of leaves'] },
  'Corn Common Rust':             { causes: ['Puccinia sorghi fungus', 'Cool humid weather', 'Wind-borne spores'], treatment: ['Apply propiconazole fungicide', 'Early season control is critical'], prevention: ['Resistant hybrids', 'Early planting to avoid peak spore periods'], symptoms: ['Powdery orange-brown pustules on both leaf surfaces', 'Pustules turn dark as they mature'] },
  'Corn Northern Leaf Blight':    { causes: ['Exserohilum turcicum fungus', 'Moderate temperature with high humidity', 'Crop debris'], treatment: ['Apply strobilurin or triazole fungicide at VT/R1', 'Remove and bury debris'], prevention: ['Resistant varieties', 'Crop rotation', 'Minimum tillage reduction'], symptoms: ['Long elliptical grey-green lesions', 'Lesions 2.5-15 cm long', 'Severely affected leaves die prematurely'] },
  'Apple Apple Scab':             { causes: ['Venturia inaequalis fungus', 'Cool wet spring', 'Infected fallen leaves'], treatment: ['Apply captan or myclobutanil fungicide', 'Remove fallen leaves', 'Prune for airflow'], prevention: ['Resistant varieties', 'Sanitation of orchard floor', 'Protective sprays from green tip'], symptoms: ['Olive-green to black velvety lesions on leaves', 'Scabby corky lesions on fruit', 'Leaf curling and drop'] },
  'Apple Black Rot':              { causes: ['Botryosphaeria obtusa fungus', 'Wounded or stressed trees', 'Mummified fruit'], treatment: ['Prune out infected wood', 'Apply captan fungicide', 'Remove mummified fruit'], prevention: ['Remove dead wood', 'Protect from frost damage', 'Proper thinning'], symptoms: ['Circular brown rot on fruit', 'Frogeye leaf spot', 'Cankers on branches'] },
  'Apple Cedar Rust':             { causes: ['Gymnosporangium juniperi-virginianae', 'Nearby cedar/juniper trees', 'Wet spring weather'], treatment: ['Apply myclobutanil fungicide', 'Remove cedar galls nearby'], prevention: ['Resistant apple varieties', 'Remove alternate host plants (cedar)', 'Protective sprays from pink bud stage'], symptoms: ['Yellow-orange spots on upper leaf surface', 'Tube-like structures on undersides', 'Premature defoliation'] },
  'Grape Black Rot':              { causes: ['Guignardia bidwellii fungus', 'Warm wet conditions', 'Infected mummified berries'], treatment: ['Apply myclobutanil or mancozeb', 'Remove infected berries and mummies', 'Improve canopy ventilation'], prevention: ['Remove and destroy mummies', 'Prune for airflow', 'Early season preventive sprays'], symptoms: ['Tan spots with dark margins on leaves', 'Berries rot and shrivel to hard black mummies'] },
  'Grape Esca (Black Measles)':   { causes: ['Complex of wood-infecting fungi', 'Pruning wounds', 'Stressed vines'], treatment: ['No cure; remove and destroy infected vines', 'Protect pruning wounds with fungicide paste'], prevention: ['Use clean pruning tools', 'Prune in dry conditions', 'Avoid large pruning cuts'], symptoms: ['Tiger-stripe pattern on leaves', 'Berries with dark spots (black measles)', 'Sudden vine collapse in summer'] },
  'Grape Leaf Blight':            { causes: ['Pseudocercospora vitis fungus', 'Late season humidity', 'Dense canopy'], treatment: ['Copper or mancozeb fungicide', 'Improve canopy management'], prevention: ['Proper trellising', 'Removal of infected leaves', 'Good air circulation'], symptoms: ['Angular brown spots on leaves', 'Premature defoliation', 'Weakened fruit development'] },
  'Orange Haunglongbing (Citrus Greening)': { causes: ['Candidatus Liberibacter bacterium', 'Asian citrus psyllid vector', 'No cure'], treatment: ['Remove and destroy infected trees', 'Control psyllid populations with insecticide', 'Nutritional sprays may delay decline'], prevention: ['Use certified disease-free budwood', 'Control psyllid populations', 'Monitor regularly'], symptoms: ['Asymmetric yellow mottling of leaves (blotchy mottle)', 'Small misshapen lopsided fruit', 'Premature fruit drop'] },
  'Peach Bacterial Spot':         { causes: ['Xanthomonas arboricola pv. pruni', 'Warm rainy conditions', 'Wind abrasion creating entry wounds'], treatment: ['Copper hydroxide bactericide sprays', 'Avoid excessive nitrogen', 'Remove infected twigs'], prevention: ['Resistant varieties', 'Windbreaks', 'Protective copper sprays from shuck split'], symptoms: ['Water-soaked spots on leaves turning brown', 'Fruit spots that crack', 'Twig cankers with dark lesions'] },
  'Strawberry Leaf Scorch':       { causes: ['Diplocarpon earlianum fungus', 'Wet humid conditions', 'Infected plant debris'], treatment: ['Apply captan or myclobutanil fungicide', 'Remove infected leaves', 'Improve drainage'], prevention: ['Disease-free planting material', 'Renovation after harvest', 'Avoid overhead irrigation'], symptoms: ['Irregular purple-red spots on leaves', 'Spots with no distinct border (unlike leaf spot)', 'Leaves look scorched and wither'] },
  'Cherry Powdery Mildew':        { causes: ['Podosphaera clandestina fungus', 'Dry weather with high humidity', 'Dense foliage'], treatment: ['Apply sulphur or trifloxystrobin fungicide', 'Prune for airflow', 'Avoid excessive nitrogen'], prevention: ['Resistant varieties', 'Proper pruning', 'Avoid high-nitrogen fertilizers'], symptoms: ['White powdery coating on leaves and young shoots', 'Fruit russeting', 'Distorted young growth'] },
  'Squash Powdery Mildew':        { causes: ['Podosphaera xanthii fungus', 'Dry weather with high humidity', 'Dense planting'], treatment: ['Potassium bicarbonate or sulphur spray', 'Neem oil', 'Remove heavily infected leaves'], prevention: ['Resistant varieties', 'Good spacing', 'Avoid evening watering'], symptoms: ['White powdery patches on leaves', 'Yellowing and browning of leaves', 'Reduced fruit quality'] },
};

const HEALTHY_INFO = {
  symptoms: ['No disease symptoms detected'],
  causes: ['Plant appears healthy'],
  treatment: ['Continue regular care and monitoring', 'Maintain proper irrigation and nutrition'],
  prevention: ['Regular scouting for early disease detection', 'Balanced fertilization', 'Good sanitation practices'],
};

/** Map a model label → structured analysis matching the Gemini API shape */
function labelToAnalysis(label, confidence) {
  const isHealthy = label.toLowerCase().includes('healthy');
  const parts = label.split(' ');
  const crop = parts[0];
  const disease = isHealthy ? 'No Disease Detected' : parts.slice(1).join(' ');
  const info = isHealthy ? HEALTHY_INFO : (DISEASE_INFO[label] || {
    symptoms: [`${disease} detected on ${crop}`],
    causes: ['Unknown pathogen or environmental stress'],
    treatment: ['Consult a local agricultural expert for specific treatment'],
    prevention: ['Regular monitoring', 'Good cultural practices', 'Crop rotation'],
  });

  const confidencePct = Math.round(confidence * 100);
  const confidenceLabel = confidencePct >= 80 ? 'High' : confidencePct >= 55 ? 'Medium' : 'Low';

  return {
    crop,
    disease,
    confidence: confidenceLabel,
    reasoning: isHealthy
      ? `The plant appears healthy with ${confidencePct}% confidence. No significant disease symptoms detected.`
      : `${label} identified with ${confidencePct}% confidence based on on-device MobileNetV2 analysis. ${confidenceLabel} confidence result.`,
    symptoms: info.symptoms || [],
    causes: info.causes || [],
    treatment: info.treatment || [],
    prevention: info.prevention || [],
    offlineMode: true,
    modelConfidencePct: confidencePct,
    topLabel: label,
  };
}

/** Run TFLite inference via Python subprocess, reading base64 from stdin */
function runTflite(base64Image) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [SCRIPT_PATH], {
      env: { ...process.env, TF_CPP_MIN_LOG_LEVEL: '3', PYTHONWARNINGS: 'ignore', TF_ENABLE_ONEDNN_OPTS: '0' },
    });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', d => { stdout += d.toString(); });
    py.stderr.on('data', d => { stderr += d.toString(); });

    py.on('close', code => {
      const out = stdout.trim();
      if (!out) {
        return reject(new Error(`TFLite script produced no output. stderr: ${stderr.slice(0, 300)}`));
      }
      // Find the last JSON line (TF logs may appear before it on stdout)
      const lines = out.split('\n');
      const jsonLine = lines.reverse().find(l => l.trim().startsWith('{'));
      if (!jsonLine) {
        return reject(new Error(`No JSON in TFLite output: ${out.slice(0, 200)}`));
      }
      try {
        const result = JSON.parse(jsonLine.trim());
        if (!result.ok) return reject(new Error(result.error || 'TFLite inference failed'));
        resolve(result);
      } catch (e) {
        reject(new Error(`JSON parse error: ${e.message} — raw: ${jsonLine.slice(0, 100)}`));
      }
    });

    py.on('error', err => reject(new Error(`Failed to start python: ${err.message}`)));

    // Write base64 image to stdin
    const imageData = base64Image.includes(',') ? base64Image : base64Image;
    py.stdin.write(imageData);
    py.stdin.end();
  });
}

/** POST /api/diagnose/quick */
export async function quickDiagnose(req, res) {
  const { imageBase64, mimeType } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    return res.status(400).json({ message: 'imageBase64 is required' });
  }

  try {
    const tfliteResult = await runTflite(imageBase64);
    const top = tfliteResult.predictions[0];

    // Build structured analysis from top prediction
    const analysis = labelToAnalysis(top.disease, top.confidence);

    // Include all 3 predictions for display
    analysis.allPredictions = tfliteResult.predictions.map(p => ({
      label: p.disease,
      confidence: Math.round(p.confidence * 100),
    }));
    analysis.inferenceMs = tfliteResult.inference_ms;

    return res.status(200).json({
      analysis,
      meta: { offlineModel: true, inferenceMs: tfliteResult.inference_ms },
    });
  } catch (err) {
    console.error('[QuickDiagnose] Error:', err.message);
    return res.status(500).json({
      message: 'On-device model inference failed',
      error: err.message,
    });
  }
}

/** Helper for AI fallback */
export async function getTfliteFallbackAnalysis(imageBase64) {
  const tfliteResult = await runTflite(imageBase64);
  const top = tfliteResult.predictions[0];
  const analysis = labelToAnalysis(top.disease, top.confidence);
  analysis.allPredictions = tfliteResult.predictions.map(p => ({
    label: p.disease,
    confidence: Math.round(p.confidence * 100),
  }));
  analysis.inferenceMs = tfliteResult.inference_ms;
  return analysis;
}
