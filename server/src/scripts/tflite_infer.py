"""
tflite_infer.py – Standalone TFLite inference script for Krushak
Called by the Express server via child_process.spawn.

Usage (reads base64 image from stdin):
  echo <base64_string> | python tflite_infer.py

Or with a file path argument (for quick CLI testing):
  python tflite_infer.py --file path/to/image.jpg

Outputs JSON to stdout:
  { "ok": true, "predictions": [...], "inference_ms": 82 }
  { "ok": false, "error": "..." }
"""

import sys, json, time, os, tempfile, base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]   # KRUSHAK MAIN/
MODEL_PATH  = ROOT / "model" / "plant_disease_mobilenet.tflite"
LABELS_PATH = ROOT / "model" / "disease_labels.txt"

def load_labels():
    labels = {}
    with open(LABELS_PATH, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            idx, label = line.split(",", 1)
            labels[int(idx)] = label.strip()
    return labels

def preprocess(img_path):
    import numpy as np
    from PIL import Image
    img = Image.open(img_path).convert("RGB").resize((224, 224))
    arr = np.array(img, dtype=float) / 255.0
    mean = [0.485, 0.456, 0.406]
    std  = [0.229, 0.224, 0.225]
    for c in range(3):
        arr[:,:,c] = (arr[:,:,c] - mean[c]) / std[c]
    import numpy as np
    return np.array(arr, dtype="float32")[None]  # (1,224,224,3)

def run_inference(tmp_path):
    import numpy as np
    import tensorflow as tf

    tensor = preprocess(tmp_path)
    labels = load_labels()

    interp = tf.lite.Interpreter(model_path=str(MODEL_PATH))
    interp.allocate_tensors()
    inp = interp.get_input_details()
    out = interp.get_output_details()

    t0 = time.time()
    interp.set_tensor(inp[0]["index"], tensor)
    interp.invoke()
    inf_ms = round((time.time() - t0) * 1000, 1)

    logits = interp.get_tensor(out[0]["index"])[0]
    # Softmax
    import numpy as np
    probs = np.exp(logits - logits.max())
    probs /= probs.sum()

    top_k = sorted(enumerate(probs.tolist()), key=lambda x: -x[1])[:3]
    predictions = [
        {
            "disease": labels.get(i, "Unknown"),
            "confidence": round(p, 4),
            "class_id": i,
        }
        for i, p in top_k
    ]

    return {"ok": True, "predictions": predictions, "inference_ms": inf_ms}


if __name__ == "__main__":
    try:
        # Check for --file <path> mode (CLI testing)
        if len(sys.argv) >= 3 and sys.argv[1] == "--file":
            tmp_path = sys.argv[2]
            result = run_inference(tmp_path)
            print(json.dumps(result))
            sys.exit(0)

        # Default: read base64 from stdin (used by Express server)
        image_b64 = sys.stdin.read().strip()
        if not image_b64:
            print(json.dumps({"ok": False, "error": "No image data on stdin"}))
            sys.exit(1)

        # Strip data URI prefix if present
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        raw = base64.b64decode(image_b64)

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name

        try:
            result = run_inference(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

        print(json.dumps(result))

    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        sys.exit(1)
