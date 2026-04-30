# -*- coding: utf-8 -*-
"""
Export MobileNetV2 plant disease model to ONNX using HuggingFace Optimum.
Then benchmark both models against PlantVillage test images.

Run:  python convert_to_onnx.py
Deps: pip install optimum[onnxruntime] transformers datasets pillow
"""

import sys, json, shutil, time
import numpy as np
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

MODEL_ID   = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
SCRIPT_DIR = Path(__file__).parent
OUT_DIR    = SCRIPT_DIR / "onnx_output"
NEW_ONNX   = OUT_DIR / "plant_disease_mobilenet.onnx"
LABELS_PATH= OUT_DIR / "plant_labels.json"
MOBILE_DIR = SCRIPT_DIR.parent / "mobile" / "assets" / "models"
OLD_ONNX   = MOBILE_DIR / "plant_disease.onnx"

for d in (OUT_DIR, MOBILE_DIR):
    d.mkdir(parents=True, exist_ok=True)

# ════════════════════════════════════════════════════════════════════════════
# STEP 1 — Export via Optimum (correct HuggingFace ONNX export)
# ════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print(" STEP 1: Export MobileNetV2 -> ONNX via HuggingFace Optimum")
print("=" * 70)

try:
    from optimum.onnxruntime import ORTModelForImageClassification
    from transformers import AutoFeatureExtractor

    print("  Downloading and exporting model (this may take a minute)...")
    ort_model = ORTModelForImageClassification.from_pretrained(MODEL_ID, export=True)
    extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID)

    # Save ONNX to our output folder
    ort_model.save_pretrained(str(OUT_DIR / "mobilenet_onnx_export"))
    exported_onnx = OUT_DIR / "mobilenet_onnx_export" / "model.onnx"
    shutil.copy(exported_onnx, NEW_ONNX)

    # Get labels
    labels = [ort_model.config.id2label[i] for i in range(len(ort_model.config.id2label))]
    with open(LABELS_PATH, "w", encoding="utf-8") as f:
        json.dump(labels, f, indent=2)

    size_mb = NEW_ONNX.stat().st_size / 1_048_576
    print(f"  OK: {NEW_ONNX.name} ({size_mb:.1f} MB) | {len(labels)} classes")
    print(f"  Preprocessor: mean={extractor.image_mean} std={extractor.image_std}")

    shutil.copy(NEW_ONNX,    MOBILE_DIR / "plant_disease_mobilenet.onnx")
    shutil.copy(LABELS_PATH, MOBILE_DIR / "plant_labels.json")
    print(f"  Copied to: {MOBILE_DIR}")

    USE_ORT_MODEL = ort_model  # use for direct inference
    OPTIMUM_OK = True

except ImportError:
    print("  optimum not found. Falling back to torch.onnx.export...")
    OPTIMUM_OK = False

if not OPTIMUM_OK:
    import torch
    from transformers import AutoModelForImageClassification, AutoFeatureExtractor

    model     = AutoModelForImageClassification.from_pretrained(MODEL_ID)
    extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID)
    model.eval()
    labels = [model.config.id2label[i] for i in range(len(model.config.id2label))]

    dummy = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        torch.onnx.export(model, dummy, str(NEW_ONNX),
            export_params=True, opset_version=14, do_constant_folding=True,
            input_names=["pixel_values"], output_names=["logits"],
            dynamic_axes={"pixel_values":{0:"batch"},"logits":{0:"batch"}},
            dynamo=False)

    with open(LABELS_PATH,"w",encoding="utf-8") as f:
        json.dump(labels, f, indent=2)
    size_mb = NEW_ONNX.stat().st_size / 1_048_576
    shutil.copy(NEW_ONNX,    MOBILE_DIR / "plant_disease_mobilenet.onnx")
    shutil.copy(LABELS_PATH, MOBILE_DIR / "plant_labels.json")
    print(f"  Saved: {NEW_ONNX.name} ({size_mb:.1f} MB)")
    USE_ORT_MODEL = None

# ════════════════════════════════════════════════════════════════════════════
# STEP 2 — Load ONNX sessions
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print(" STEP 2: Loading ONNX inference sessions")
print("=" * 70)

import onnxruntime as ort

new_sess = ort.InferenceSession(str(NEW_ONNX), providers=["CPUExecutionProvider"])
new_input_name = new_sess.get_inputs()[0].name
print(f"  NEW: {NEW_ONNX.name} | input='{new_input_name}' | {size_mb:.1f} MB")

old_sess = None
if OLD_ONNX.exists():
    old_sess  = ort.InferenceSession(str(OLD_ONNX), providers=["CPUExecutionProvider"])
    old_input = old_sess.get_inputs()[0].name
    old_mb    = OLD_ONNX.stat().st_size / 1_048_576
    print(f"  OLD: {OLD_ONNX.name} | input='{old_input}' | {old_mb:.1f} MB")
else:
    print(f"  OLD model not found at {OLD_ONNX}")

# ════════════════════════════════════════════════════════════════════════════
# STEP 3 — Quick PyTorch sanity check (verifies model is valid)
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print(" STEP 3: Loading test dataset from HuggingFace")
print("=" * 70)

from datasets import load_dataset

DATASET_CANDIDATES = [
    ("nateraw/plant-disease", None),
    ("ciocan-dumitru/plant-village", None),
    ("Rajaram1996/PlantVillageDataset", None),
    ("Akash1301/PlantDiseaseDetection", None),
]

ds = None
for repo, cfg in DATASET_CANDIDATES:
    try:
        print(f"  Trying {repo}...")
        kwargs = {"split": "train"}
        if cfg:
            kwargs["name"] = cfg
        ds = load_dataset(repo, **kwargs)
        print(f"  OK: {len(ds)} images | features={list(ds.features.keys())}")
        break
    except Exception as e:
        print(f"  Failed: {e}")


if ds is None:
    print("  All sources failed. Cannot run benchmark.")
    sys.exit(1)

# Auto-detect the label field and image field
print(f"\n  Dataset features: {list(ds.features.keys())}")
label_field = None
image_field = None
for k, v in ds.features.items():
    t = str(type(v).__name__)
    if "Class" in t or "label" in k.lower():
        label_field = k
    if "Image" in t or "image" in k.lower():
        image_field = k

if label_field is None or image_field is None:
    print(f"  ERROR: Could not find label/image fields. Features: {ds.features}")
    sys.exit(1)

print(f"  Using label='{label_field}' image='{image_field}'")
hf_names = ds.features[label_field].names

def norm(s):
    return s.lower().replace("_"," ").replace(","," ").replace("("," ").replace(")"," ").replace("___"," ")

# Build label mapping
hf_to_model = {}
for hi, hn in enumerate(hf_names):
    hw = set(w for w in norm(hn).split() if len(w) > 2)
    for mi, mn in enumerate(labels):
        mw = set(w for w in norm(mn).split() if len(w) > 2)
        if len(hw & mw) >= 2:
            hf_to_model[hi] = mi
            break

print(f"  Label mapping: {len(hf_to_model)}/{len(hf_names)} HF classes matched")

# Collect 3 images per class
IMGS_PER_CLASS = 3
counts, test_samples = {}, []
for ex in ds:
    hi = ex[label_field]
    if hi not in hf_to_model or counts.get(hi,0) >= IMGS_PER_CLASS:
        continue
    test_samples.append((ex[image_field], hf_to_model[hi], hf_names[hi]))
    counts[hi] = counts.get(hi,0) + 1
    if all(counts.get(i,0) >= IMGS_PER_CLASS for i in hf_to_model):
        break

print(f"  Collected {len(test_samples)} images across {len(counts)} classes")

# ════════════════════════════════════════════════════════════════════════════
# STEP 4 — Benchmark
# ════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print(" STEP 4: Benchmark")
print("=" * 70)

def preprocess_new(img):
    inputs = extractor(images=img, return_tensors="np")
    return inputs["pixel_values"].astype(np.float32)

def preprocess_old(img):
    # Old ViT model: standard ImageNet normalization
    mean_old = np.array([0.5,0.5,0.5], dtype=np.float32)
    std_old  = np.array([0.5,0.5,0.5], dtype=np.float32)
    from PIL import Image as PILImage
    img = img.convert("RGB").resize((224,224))
    arr = (np.array(img,dtype=np.float32)/255.0 - mean_old)/std_old
    return arr.transpose(2,0,1)[np.newaxis]

def infer(session, inp_name, inp):
    t0 = time.perf_counter()
    out= session.run(None, {inp_name: inp})[0][0]
    ms = (time.perf_counter()-t0)*1000
    probs = np.exp(out-out.max()); probs/=probs.sum()
    pred  = int(np.argmax(probs))
    return pred, probs[pred]*100, ms

# Print header
hdr = f"{'Ground Truth':<40} | {'NEW MobileNetV2':<35} Conf  OK"
if old_sess:
    hdr += f" | {'OLD ViT-tiny':<35} Conf  OK"
print(hdr)
print("-"*(len(hdr)+5))

new_c=new_t=old_c=old_t=0
new_cls={}; old_cls={}

for img, true_idx, hf_name in test_samples:
    true_name = labels[true_idx]
    inp_new   = preprocess_new(img)

    np_idx, np_conf, np_ms = infer(new_sess, new_input_name, inp_new)
    np_name = labels[np_idx]
    np_ok   = np_idx == true_idx
    new_c  += np_ok; new_t += 1
    new_cls.setdefault(true_name,[0,0]); new_cls[true_name][1]+=1
    if np_ok: new_cls[true_name][0]+=1

    row = f"{true_name:<40} | {np_name:<35} {np_conf:5.1f}% {'YES' if np_ok else 'NO '}"

    if old_sess:
        inp_old = preprocess_old(img)
        op_idx, op_conf, op_ms = infer(old_sess, old_sess.get_inputs()[0].name, inp_old)
        op_name = labels[op_idx] if op_idx < len(labels) else f"Class_{op_idx}"
        op_ok   = op_idx == true_idx
        old_c  += op_ok; old_t += 1
        old_cls.setdefault(true_name,[0,0]); old_cls[true_name][1]+=1
        if op_ok: old_cls[true_name][0]+=1
        row += f" | {op_name:<35} {op_conf:5.1f}% {'YES' if op_ok else 'NO '}"

    print(row)

# ── Summary ───────────────────────────────────────────────────────────────
print("\n" + "="*70)
print(f"  NEW MobileNetV2 : {new_c}/{new_t}  ({new_c/new_t*100:.1f}%)")
if old_sess:
    print(f"  OLD ViT-tiny    : {old_c}/{old_t}  ({old_c/old_t*100:.1f}%)")
print("="*70)

print("\nPer-class accuracy — NEW MobileNetV2:")
print(f"{'Class':<45} C/T    Acc")
print("-"*60)
for cls,(c,t) in sorted(new_cls.items()):
    bar="#"*c+"."*(t-c)
    print(f"{cls:<45} {c}/{t}  {c/t*100:5.1f}%  [{bar}]")

print(f"\nONNX: {size_mb:.1f} MB | Copied to {MOBILE_DIR}")
print("DONE — Set MODEL_ASSET in onnxModel.js to 'plant_disease_mobilenet.onnx'")
