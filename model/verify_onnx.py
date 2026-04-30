# -*- coding: utf-8 -*-
"""Quick verification: does ONNX match PyTorch predictions?"""
import sys, json
import numpy as np
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import torch
from transformers import AutoModelForImageClassification, AutoFeatureExtractor
import onnxruntime as ort
from PIL import Image

MODEL_ID    = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
ONNX_PATH   = Path("onnx_output/plant_disease_mobilenet.onnx")
LABELS_PATH = Path("onnx_output/plant_labels.json")

labels    = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
sess      = ort.InferenceSession(str(ONNX_PATH), providers=["CPUExecutionProvider"])
model     = AutoModelForImageClassification.from_pretrained(MODEL_ID).eval()
extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID)

print("Comparing PyTorch vs ONNX on 10 random synthetic images...")
print(f"{'#':<3}  {'PyTorch Prediction':<42} {'ONNX Prediction':<42} Match")
print("-" * 93)

all_match = True
for i in range(10):
    np.random.seed(i * 13)
    dummy_arr = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    img       = Image.fromarray(dummy_arr, mode="RGB")
    inputs    = extractor(images=img, return_tensors="pt")
    inp_np    = inputs["pixel_values"].numpy()

    with torch.no_grad():
        pt_logits  = model(**inputs).logits[0].numpy()
    onnx_logits = sess.run(None, {"pixel_values": inp_np})[0][0]

    pt_pred   = int(np.argmax(pt_logits))
    onnx_pred = int(np.argmax(onnx_logits))
    match     = pt_pred == onnx_pred
    all_match = all_match and match

    pt_name   = labels[pt_pred]
    onnx_name = labels[onnx_pred]
    ok        = "YES" if match else "NO "
    print(f"{i:<3}  {pt_name:<42} {onnx_name:<42} {ok}")

print()
if all_match:
    print("RESULT: PASS -- ONNX matches PyTorch 100% on all 10 inputs")
else:
    print("RESULT: FAIL -- some predictions differ")

print(f"Model: {ONNX_PATH.name}  ({ONNX_PATH.stat().st_size/1048576:.1f} MB)")
print(f"Classes: {len(labels)}")
