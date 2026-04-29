from PIL import Image
import torch
from transformers import ViTFeatureExtractor, ViTForImageClassification


feature_extractor = ViTFeatureExtractor.from_pretrained('wambugu71/crop_leaf_diseases_vit')
model = ViTForImageClassification.from_pretrained(
    'wambugu71/crop_leaf_diseases_vit',
    ignore_mismatched_sizes=True
)


image = Image.open("rice.png").convert("RGB")
inputs = feature_extractor(images=image, return_tensors="pt")
outputs = model(**inputs)

# Top prediction
predicted_idx = outputs.logits.argmax(-1).item()
print("Predicted:", model.config.id2label[predicted_idx])

# Top 5
probs = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]
top5 = torch.topk(probs, 5)
print("\nTop 5:")
for score, idx in zip(top5.values, top5.indices):
    print(f"  {model.config.id2label[idx.item()]:<30} {score.item()*100:.2f}%")