#!/usr/bin/env python3
"""
Quick test - Simplest way to test your model
Just run: python quick_test.py your_image.jpg
"""

import sys
from pathlib import Path
from ultralytics import YOLO


def main():
    if len(sys.argv) < 2:
        print("Usage: python quick_test.py <image_path>")
        print("\nExample:")
        print("  python quick_test.py my_handwriting.jpg")
        print("  python quick_test.py C:/Users/LENOVO/Desktop/note.jpg")
        return

    image_path = sys.argv[1]
    model_path = "runs/detect/train/weights/best.pt"

    # Check if model exists
    if not Path(model_path).exists():
        print(f"Model not found at: {model_path}")
        print("\nPlease wait for training to complete first!")
        print("Or specify model path: python quick_test.py <image> <model_path>")
        return

    # Check if image exists
    if not Path(image_path).exists():
        print(f"Image not found: {image_path}")
        return

    print(f"\nLoading model from: {model_path}")
    print(f"Testing image: {image_path}\n")

    # Load and run
    model = YOLO(model_path)
    results = model.predict(image_path, conf=0.25, save=True, verbose=True)

    # Show results
    result = results[0]
    boxes = result.boxes

    print(f"\n{'=' * 50}")
    print(f"RESULTS:")
    print(f"{'=' * 50}")
    print(f"Detections found: {len(boxes)}")

    if len(boxes) > 0:
        print(f"\nHandwriting regions detected:")
        for i, box in enumerate(boxes):
            conf = float(box.conf[0])
            print(f"  {i + 1}. Confidence: {conf:.2%}")
    else:
        print("\nNo handwriting detected.")
        print("Try: python quick_test.py <image> --conf 0.1")

    print(f"\nAnnotated image saved to: runs/detect/predict")
    print(f"{'=' * 50}\n")


if __name__ == "__main__":
    main()
