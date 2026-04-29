import onnxruntime as ort
import numpy as np
from PIL import Image
from transformers import ViTForImageClassification

session = ort.InferenceSession("plant_model.onnx")

# Get correct labels
hf_model = ViTForImageClassification.from_pretrained(
    'wambugu71/crop_leaf_diseases_vit',
    ignore_mismatched_sizes=True
)
LABELS = [hf_model.config.id2label[i] for i in range(len(hf_model.config.id2label))]

# ImageNet normalization
mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

image = Image.open("images/potato.png").convert("RGB").resize((224, 224))
img_array = np.array(image, dtype=np.float32) / 255.0  # ✅ float32 explicitly
img_array = (img_array - mean) / std
img_array = np.transpose(img_array, (2, 0, 1))
img_array = np.expand_dims(img_array, 0)

# Run inference
outputs = session.run(None, {"pixel_values": img_array})
logits = outputs[0][0]

probs = np.exp(logits) / np.sum(np.exp(logits))
top3_idx = np.argsort(probs)[::-1][:3]

print("Top 3 predictions:")
for idx in top3_idx:
    print(f"  {LABELS[idx]:<30} {probs[idx]*100:.1f}%")