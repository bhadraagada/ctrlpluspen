#!/usr/bin/env python3
"""
Test trained YOLOv8 model on your own images
Simple inference script for handwriting detection
"""

import argparse
from pathlib import Path
from ultralytics import YOLO
from PIL import Image
import time


def test_single_image(model_path, image_path, conf_threshold=0.25, save_results=True):
    """Test model on a single image"""

    print(f"\n{'=' * 60}")
    print(f"🔍 Testing Handwriting Detection")
    print(f"{'=' * 60}")
    print(f"📷 Image: {image_path}")
    print(f"🤖 Model: {model_path}")
    print(f"🎯 Confidence threshold: {conf_threshold}")
    print(f"{'=' * 60}\n")

    # Load model
    print("Loading model...")
    model = YOLO(model_path)
    print("✅ Model loaded successfully!\n")

    # Load image
    if not Path(image_path).exists():
        print(f"❌ Error: Image not found at {image_path}")
        return

    img = Image.open(image_path)
    print(f"📐 Image size: {img.size[0]}x{img.size[1]}")

    # Run inference
    print(f"\n🚀 Running detection...\n")
    start_time = time.time()

    results = model.predict(
        source=image_path,
        conf=conf_threshold,
        save=save_results,
        save_txt=False,
        save_conf=True,
        show_labels=True,
        show_conf=True,
        line_width=2,
        verbose=False,
    )

    inference_time = (time.time() - start_time) * 1000

    # Display results
    result = results[0]
    boxes = result.boxes

    print(f"{'=' * 60}")
    print(f"📊 Detection Results")
    print(f"{'=' * 60}")
    print(f"⏱️  Inference time: {inference_time:.2f}ms")
    print(f"📦 Detections found: {len(boxes)}")
    print(f"{'=' * 60}\n")

    if len(boxes) > 0:
        print("Detected regions:")
        print(f"{'#':<4} {'Confidence':<12} {'Box (x1, y1, x2, y2)'}")
        print("-" * 60)

        for i, box in enumerate(boxes):
            conf = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            print(f"{i + 1:<4} {conf:<12.3f} ({int(x1)}, {int(y1)}, {int(x2)}, {int(y2)})")

        print()

        if save_results:
            save_path = (
                result.save_dir / result.path.name
                if hasattr(result, "save_dir")
                else f"runs/detect/predict/{Path(image_path).name}"
            )
            print(
                f"💾 Results saved to: {result.save_dir if hasattr(result, 'save_dir') else 'runs/detect/predict'}"
            )
            print(f"📸 Annotated image: Look in the output folder")
    else:
        print("⚠️  No handwriting detected.")
        print("   Try lowering the confidence threshold with --conf")

    print(f"\n{'=' * 60}\n")


def test_directory(model_path, images_dir, conf_threshold=0.25, save_results=True):
    """Test model on all images in a directory"""

    images_dir = Path(images_dir)
    image_extensions = [".jpg", ".jpeg", ".png", ".bmp", ".gif"]
    image_files = [f for f in images_dir.glob("*") if f.suffix.lower() in image_extensions]

    if not image_files:
        print(f"❌ No images found in {images_dir}")
        return

    print(f"\n{'=' * 60}")
    print(f"🔍 Batch Testing Handwriting Detection")
    print(f"{'=' * 60}")
    print(f"📁 Directory: {images_dir}")
    print(f"🤖 Model: {model_path}")
    print(f"📷 Found {len(image_files)} images")
    print(f"🎯 Confidence threshold: {conf_threshold}")
    print(f"{'=' * 60}\n")

    # Load model
    print("Loading model...")
    model = YOLO(model_path)
    print("✅ Model loaded successfully!\n")

    # Run inference on all images
    print("🚀 Running batch detection...\n")
    start_time = time.time()

    results = model.predict(
        source=str(images_dir),
        conf=conf_threshold,
        save=save_results,
        save_txt=False,
        save_conf=True,
        show_labels=True,
        show_conf=True,
        line_width=2,
    )

    total_time = (time.time() - start_time) * 1000

    # Display results
    print(f"\n{'=' * 60}")
    print(f"📊 Batch Results")
    print(f"{'=' * 60}")
    print(f"⏱️  Total time: {total_time:.2f}ms")
    print(f"📷 Images processed: {len(results)}")
    print(f"⚡ Average time per image: {total_time / len(results):.2f}ms")

    total_detections = sum(len(r.boxes) for r in results)
    print(f"📦 Total detections: {total_detections}")
    print(f"📊 Average per image: {total_detections / len(results):.1f}")
    print(f"{'=' * 60}\n")

    # Summary per image
    print("Per-image summary:")
    print(f"{'Image':<30} {'Detections':<12} {'Max Conf'}")
    print("-" * 60)

    for result in results:
        img_name = Path(result.path).name
        num_boxes = len(result.boxes)
        max_conf = max([float(box.conf[0]) for box in result.boxes]) if num_boxes > 0 else 0.0
        print(f"{img_name:<30} {num_boxes:<12} {max_conf:.3f}")

    if save_results:
        print(
            f"\n💾 All results saved to: {results[0].save_dir if hasattr(results[0], 'save_dir') else 'runs/detect/predict'}"
        )

    print(f"\n{'=' * 60}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Test handwriting detection model on your images",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test on a single image
  python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image photo.jpg
  
  # Test on all images in a folder
  python scripts/test_inference.py --model runs/detect/train/weights/best.pt --images-dir test_photos/
  
  # Lower confidence threshold to detect more
  python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image photo.jpg --conf 0.1
  
  # Don't save annotated images
  python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image photo.jpg --no-save
        """,
    )

    parser.add_argument(
        "--model",
        type=str,
        required=True,
        help="Path to trained model (e.g., runs/detect/train/weights/best.pt)",
    )
    parser.add_argument("--image", type=str, default=None, help="Path to single image to test")
    parser.add_argument(
        "--images-dir", type=str, default=None, help="Path to directory of images to test"
    )
    parser.add_argument(
        "--conf", type=float, default=0.25, help="Confidence threshold (default: 0.25)"
    )
    parser.add_argument("--no-save", action="store_true", help="Don't save annotated images")

    args = parser.parse_args()

    # Validate arguments
    if not args.image and not args.images_dir:
        parser.error("Must specify either --image or --images-dir")

    if not Path(args.model).exists():
        print(f"❌ Error: Model not found at {args.model}")
        print("\n💡 Tip: Train a model first with:")
        print("   python scripts/train_detector.py --config configs/rtx3050.yaml")
        return

    save_results = not args.no_save

    # Run inference
    if args.image:
        test_single_image(args.model, args.image, args.conf, save_results)
    elif args.images_dir:
        test_directory(args.model, args.images_dir, args.conf, save_results)


if __name__ == "__main__":
    main()
