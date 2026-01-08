#!/usr/bin/env python3
"""
Generate synthetic handwriting dataset for training
Creates YOLO format annotations
"""

import argparse
import random
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import yaml
from tqdm import tqdm

# Sample text for generation
SAMPLE_TEXTS = [
    "The quick brown fox jumps over the lazy dog",
    "Hello world",
    "Machine learning is fascinating",
    "Handwriting recognition using deep learning",
    "Python programming language",
    "Artificial intelligence and neural networks",
    "Data science and analytics",
    "Natural language processing",
    "Computer vision applications",
    "Deep learning frameworks",
]


def create_handwriting_image(text, size=(640, 120), font_size=32):
    """Create a synthetic handwriting image with text"""
    # Create white background
    img = Image.new("RGB", size, color="white")
    draw = ImageDraw.Draw(img)

    # Try to use a handwriting-style font (fallback to default)
    try:
        # Try different font paths for Windows
        font_paths = [
            "C:/Windows/Fonts/segoepr.ttf",  # Segoe Print
            "C:/Windows/Fonts/Gabriola.ttf",  # Gabriola
            "C:/Windows/Fonts/arial.ttf",  # Arial fallback
        ]
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
                break
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Add some randomness to position
    x = random.randint(10, 30)
    y = random.randint(10, 30)

    # Add text with slight randomness in color (not pure black)
    color = (random.randint(0, 30), random.randint(0, 30), random.randint(0, 30))
    draw.text((x, y), text, fill=color, font=font)

    # Add slight blur for realism
    if random.random() > 0.5:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.1, 0.5)))

    # Add noise
    if random.random() > 0.7:
        img = add_noise(img)

    return img, (x, y, x + len(text) * font_size // 2, y + font_size + 10)


def add_noise(image):
    """Add random noise to image"""
    pixels = image.load()
    width, height = image.size

    for _ in range(random.randint(50, 200)):
        x = random.randint(0, width - 1)
        y = random.randint(0, height - 1)
        color = random.randint(200, 255)
        pixels[x, y] = (color, color, color)

    return image


def bbox_to_yolo(bbox, img_size):
    """Convert bbox to YOLO format (normalized xywh)"""
    x1, y1, x2, y2 = bbox
    img_w, img_h = img_size

    # Calculate center, width, height
    x_center = (x1 + x2) / 2 / img_w
    y_center = (y1 + y2) / 2 / img_h
    width = (x2 - x1) / img_w
    height = (y2 - y1) / img_h

    return x_center, y_center, width, height


def generate_dataset(num_samples, output_dir):
    """Generate synthetic dataset"""
    output_dir = Path(output_dir)
    images_dir = output_dir / "images"
    labels_dir = output_dir / "labels"

    # Create directories
    for split in ["train", "val", "test"]:
        (images_dir / split).mkdir(parents=True, exist_ok=True)
        (labels_dir / split).mkdir(parents=True, exist_ok=True)

    # Split ratios
    train_ratio = 0.7
    val_ratio = 0.2
    # test_ratio = 0.1

    print(f"Generating {num_samples} synthetic handwriting samples...")

    for i in tqdm(range(num_samples)):
        # Choose random text
        text = random.choice(SAMPLE_TEXTS)

        # Generate image
        font_size = random.randint(24, 48)
        img, bbox = create_handwriting_image(text, size=(640, 120), font_size=font_size)

        # Determine split
        rand = random.random()
        if rand < train_ratio:
            split = "train"
        elif rand < train_ratio + val_ratio:
            split = "val"
        else:
            split = "test"

        # Save image
        img_path = images_dir / split / f"sample_{i:05d}.jpg"
        img.save(img_path, quality=85)

        # Create YOLO label
        yolo_bbox = bbox_to_yolo(bbox, img.size)
        label_path = labels_dir / split / f"sample_{i:05d}.txt"

        # YOLO format: class x_center y_center width height (all normalized)
        with open(label_path, "w") as f:
            f.write(
                f"0 {yolo_bbox[0]:.6f} {yolo_bbox[1]:.6f} {yolo_bbox[2]:.6f} {yolo_bbox[3]:.6f}\n"
            )

    # Create dataset.yaml
    dataset_yaml = {
        "path": str(output_dir.absolute()),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": 1,
        "names": ["handwriting"],
    }

    with open(output_dir / "dataset.yaml", "w") as f:
        yaml.dump(dataset_yaml, f, default_flow_style=False)

    print(f"\n✅ Dataset generated successfully!")
    print(f"📁 Location: {output_dir.absolute()}")
    print(f"📊 Splits:")
    print(f"   - Train: {len(list((images_dir / 'train').glob('*.jpg')))} images")
    print(f"   - Val: {len(list((images_dir / 'val').glob('*.jpg')))} images")
    print(f"   - Test: {len(list((images_dir / 'test').glob('*.jpg')))} images")
    print(
        f"\n🚀 Ready to train! Use: python scripts/train_detector.py --data {output_dir / 'dataset.yaml'}"
    )


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic handwriting dataset")
    parser.add_argument(
        "--num-samples",
        type=int,
        default=2000,
        help="Number of samples to generate (default: 2000)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/synthetic",
        help="Output directory (default: data/synthetic)",
    )

    args = parser.parse_args()

    generate_dataset(args.num_samples, args.output_dir)


if __name__ == "__main__":
    main()
