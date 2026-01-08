#!/usr/bin/env python3
"""
Interactive demo - test model with webcam or images
Simple GUI for testing handwriting detection
"""

import argparse
from pathlib import Path
from ultralytics import YOLO
from PIL import Image
import cv2
import numpy as np


def test_webcam(model_path, conf_threshold=0.25):
    """Test model with webcam in real-time"""

    print(f"\n{'=' * 60}")
    print(f"📹 Webcam Demo - Handwriting Detection")
    print(f"{'=' * 60}")
    print(f"🤖 Model: {model_path}")
    print(f"🎯 Confidence: {conf_threshold}")
    print(f"\n⌨️  Controls:")
    print(f"   - Press 'q' to quit")
    print(f"   - Press 's' to save current frame")
    print(f"   - Press '+' to increase confidence")
    print(f"   - Press '-' to decrease confidence")
    print(f"{'=' * 60}\n")

    # Load model
    print("Loading model...")
    model = YOLO(model_path)
    print("✅ Model loaded!\n")

    # Open webcam
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Error: Cannot open webcam")
        return

    print("📹 Webcam opened. Show handwritten text to the camera!\n")

    frame_count = 0
    current_conf = conf_threshold

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        # Run inference every frame
        results = model.predict(source=frame, conf=current_conf, verbose=False, stream=False)

        # Draw results
        annotated_frame = results[0].plot()

        # Add info text
        cv2.putText(
            annotated_frame,
            f"Confidence: {current_conf:.2f}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )
        cv2.putText(
            annotated_frame,
            f"Detections: {len(results[0].boxes)}",
            (10, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2,
        )
        cv2.putText(
            annotated_frame,
            "Press 'q' to quit, 's' to save",
            (10, annotated_frame.shape[0] - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 255),
            1,
        )

        # Show frame
        cv2.imshow("Handwriting Detection", annotated_frame)

        # Handle keyboard
        key = cv2.waitKey(1) & 0xFF

        if key == ord("q"):
            break
        elif key == ord("s"):
            save_path = f"webcam_capture_{frame_count}.jpg"
            cv2.imwrite(save_path, annotated_frame)
            print(f"💾 Saved frame to {save_path}")
        elif key == ord("+") or key == ord("="):
            current_conf = min(0.95, current_conf + 0.05)
            print(f"🎯 Confidence: {current_conf:.2f}")
        elif key == ord("-") or key == ord("_"):
            current_conf = max(0.05, current_conf - 0.05)
            print(f"🎯 Confidence: {current_conf:.2f}")

    cap.release()
    cv2.destroyAllWindows()
    print("\n✅ Webcam demo ended")


def main():
    parser = argparse.ArgumentParser(description="Interactive handwriting detection demo")
    parser.add_argument("--model", type=str, required=True, help="Path to trained model")
    parser.add_argument("--conf", type=float, default=0.25, help="Initial confidence threshold")

    args = parser.parse_args()

    if not Path(args.model).exists():
        print(f"❌ Error: Model not found at {args.model}")
        return

    test_webcam(args.model, args.conf)


if __name__ == "__main__":
    main()
