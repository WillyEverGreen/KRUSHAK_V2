from transformers import ViTForImageClassification, ViTFeatureExtractor
from PIL import Image
import torch

# Load model
model = ViTForImageClassification.from_pretrained(
    'wambugu71/crop_leaf_diseases_vit',
    ignore_mismatched_sizes=True
)
model.eval()

# Dummy input for tracing
feature_extractor = ViTFeatureExtractor.from_pretrained('wambugu71/crop_leaf_diseases_vit')
dummy_image = Image.new("RGB", (224, 224))
inputs = feature_extractor(images=dummy_image, return_tensors="pt")

# Export to ONNX
torch.onnx.export(
    model,
    (inputs['pixel_values'],),
    "plant_model.onnx",
    input_names=["pixel_values"],
    output_names=["logits"],
    dynamic_axes={"pixel_values": {0: "batch_size"}},
    opset_version=14
)
print("✅ Exported to plant_model.onnx")
