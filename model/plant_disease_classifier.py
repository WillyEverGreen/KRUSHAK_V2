"""
PlantDiseaseClassifier - Python utility for crop disease diagnosis
Can be used on backend (Python) or for batch processing

Usage:
    classifier = PlantDiseaseClassifier('plant_disease_mobilenet.tflite')
    predictions = classifier.predict('path/to/leaf.jpg', top_k=3)
    print(predictions)
    # Output: [
    #     {'disease': 'Potato Early Blight', 'confidence': 0.92},
    #     {'disease': 'Potato Late Blight', 'confidence': 0.06},
    #     {'disease': 'Tomato Early Blight', 'confidence': 0.02}
    # ]
"""

import numpy as np
import tensorflow as tf
from PIL import Image
from pathlib import Path
import json
from typing import List, Dict, Tuple
import time


class PlantDiseaseClassifier:
    """TFLite-based crop disease classifier for on-device and server inference"""

    # ImageNet normalization
    MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    INPUT_SIZE = (224, 224)

    def __init__(self, model_path: str, labels_path: str = None):
        """
        Initialize the classifier with TFLite model

        Args:
            model_path: Path to .tflite model file
            labels_path: Path to disease labels file (optional, auto-load if in same dir)
        """
        self.model_path = Path(model_path)

        # Load model
        self.interpreter = tf.lite.Interpreter(model_path=str(model_path))
        self.interpreter.allocate_tensors()

        # Get tensor info
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

        # Load labels
        if labels_path is None:
            labels_path = self.model_path.parent / "disease_labels.txt"

        self.labels = self._load_labels(labels_path)
        print(f"[+] Model loaded: {model_path}")
        print(f"[+] Classes: {len(self.labels)}")

    def _load_labels(self, labels_path: Path) -> Dict[int, str]:
        """Load disease class labels from file"""
        labels = {}
        try:
            with open(labels_path, 'r') as f:
                for line in f:
                    idx, label = line.strip().split(',', 1)
                    labels[int(idx)] = label
        except Exception as e:
            print(f"[!] Error loading labels: {e}")
        return labels

    def preprocess(self, image_path: str) -> np.ndarray:
        """
        Preprocess image for model inference

        Args:
            image_path: Path to leaf image

        Returns:
            Preprocessed tensor (1, 224, 224, 3)
        """
        try:
            image = Image.open(image_path).convert("RGB")
            image = image.resize(self.INPUT_SIZE)

            # Convert to array and normalize
            img_array = np.array(image, dtype=np.float32) / 255.0
            img_array = (img_array - self.MEAN) / self.STD

            # Add batch dimension
            img_array = np.expand_dims(img_array, 0)

            return img_array.astype(np.float32)
        except Exception as e:
            raise ValueError(f"Error preprocessing image: {e}")

    def predict(self, image_path: str, top_k: int = 3,
                confidence_threshold: float = 0.0) -> List[Dict]:
        """
        Predict disease for given image

        Args:
            image_path: Path to leaf image
            top_k: Number of top predictions to return
            confidence_threshold: Min confidence to include (0.0-1.0)

        Returns:
            List of predictions: [
                {'disease': str, 'confidence': float, 'class_id': int},
                ...
            ]
        """
        # Preprocess
        input_tensor = self.preprocess(image_path)

        # Run inference
        start_time = time.time()
        self.interpreter.set_tensor(self.input_details[0]['index'], input_tensor)
        self.interpreter.invoke()
        inference_time = time.time() - start_time

        # Get output
        logits = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
        probs = np.exp(logits) / np.sum(np.exp(logits))

        # Get top-k predictions
        top_indices = np.argsort(probs)[::-1][:top_k]

        predictions = []
        for idx in top_indices:
            confidence = float(probs[idx])
            if confidence >= confidence_threshold:
                predictions.append({
                    'disease': self.labels.get(int(idx), 'Unknown'),
                    'confidence': round(confidence, 4),
                    'class_id': int(idx)
                })

        return {
            'predictions': predictions,
            'inference_time_ms': round(inference_time * 1000, 2),
            'input_path': str(image_path)
        }

    def batch_predict(self, image_dir: str, top_k: int = 3) -> List[Dict]:
        """
        Predict diseases for all images in a directory

        Args:
            image_dir: Directory containing leaf images
            top_k: Top predictions per image

        Returns:
            List of predictions for each image
        """
        results = []
        image_dir = Path(image_dir)

        # Get all image files
        image_files = list(image_dir.glob('*.png')) + list(image_dir.glob('*.jpg')) + list(image_dir.glob('*.jpeg'))

        for image_file in image_files:
            try:
                result = self.predict(str(image_file), top_k=top_k)
                results.append(result)
                print(f"[+] {image_file.name}: {result['predictions'][0]['disease']} "
                      f"({result['predictions'][0]['confidence']*100:.1f}%)")
            except Exception as e:
                print(f"[-] {image_file.name}: {e}")

        return results

    def to_json(self, result: Dict) -> str:
        """Convert prediction result to JSON"""
        return json.dumps(result, indent=2)


# Example usage
if __name__ == "__main__":
    # Initialize classifier
    classifier = PlantDiseaseClassifier(
        'plant_disease_mobilenet.tflite',
        'disease_labels.txt'
    )

    # Test with single image
    print("\n" + "=" * 70)
    print("Single Image Test")
    print("=" * 70)

    test_images = [
        'images/corn.png',
        'images/potato.png',
        'images/rice.png'
    ]

    for img_path in test_images:
        try:
            result = classifier.predict(img_path, top_k=3)
            print(f"\n{img_path}:")
            for pred in result['predictions']:
                print(f"  {pred['disease']:<40} {pred['confidence']*100:>6.2f}%")
            print(f"  Inference: {result['inference_time_ms']} ms")
        except FileNotFoundError:
            print(f"[-] File not found: {img_path}")

    # Batch test
    print("\n" + "=" * 70)
    print("Batch Test")
    print("=" * 70)

    try:
        batch_results = classifier.batch_predict('images/', top_k=3)
        print(f"\nProcessed {len(batch_results)} images")
    except Exception as e:
        print(f"[-] Batch processing error: {e}")
