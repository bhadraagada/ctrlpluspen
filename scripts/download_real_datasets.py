"""
Download Real Handwriting Datasets
Downloads freely available handwriting datasets for training

Available datasets:
1. CVL (Computer Vision Lab) - Free handwriting dataset
2. RIMES - French handwriting (registration required but free)
3. Microsoft COCO-Text - Scene text with handwriting
4. Synthetic handwriting using PIL with realistic fonts
"""

import os
import sys
import argparse
import zipfile
import requests
from pathlib import Path
from tqdm import tqdm
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import random
import string


def download_file(url: str, dest: Path, desc: str = None):
    """Download file with progress bar."""
    response = requests.get(url, stream=True)
    total = int(response.headers.get('content-length', 0))
    
    dest.parent.mkdir(parents=True, exist_ok=True)
    
    with open(dest, 'wb') as f, tqdm(
        desc=desc or dest.name,
        total=total,
        unit='B',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for chunk in response.iter_content(chunk_size=8192):
            size = f.write(chunk)
            bar.update(size)


def generate_handwriting_fonts_dataset(
    output_dir: Path,
    num_samples: int = 5000,
    texts: list = None,
):
    """
    Generate synthetic handwriting using handwriting-style fonts.
    Much more realistic than EMNIST for cursive text.
    Includes both cursive and block/print styles.
    """
    print("\n" + "="*60)
    print(" Generating Handwriting-Style Font Dataset")
    print("="*60)
    
    # Handwriting fonts - mix of cursive and print styles
    handwriting_fonts = [
        # Cursive/Script fonts
        'segoepr.ttf',  # Segoe Print (semi-cursive)
        'MISTRAL.TTF',  # Mistral (cursive)
        'BRUSHSCI.TTF',  # Brush Script (cursive)
        'FREESTYLE.TTF',  # Freestyle Script (cursive)
        'VIVALDII.TTF',  # Vivaldi (cursive)
        # Print/Block fonts
        'Comic.ttf',  # Comic Sans (print)
        'KOMIKAX_.ttf',  # Komika Axis (print)
        'ARCENA.ttf',  # Arcena (print)
    ]
    
    # Try to find available fonts
    font_dirs = [
        Path('C:/Windows/Fonts'),
        Path('/usr/share/fonts'),
        Path('/System/Library/Fonts'),
    ]
    
    available_fonts = []
    for font_name in handwriting_fonts:
        for font_dir in font_dirs:
            font_path = font_dir / font_name
            if font_path.exists():
                available_fonts.append(str(font_path))
                break
    
    if not available_fonts:
        print("⚠️  No handwriting fonts found. Using default font.")
        available_fonts = [None]  # Will use PIL default
    else:
        print(f"✅ Found {len(available_fonts)} handwriting fonts")
    
    # Default texts if none provided - mix of common words and sentences
    if texts is None:
        texts = [
            # Single words
            "Because", "Hello", "World", "Python", "Machine", "Learning",
            "Computer", "Science", "Research", "Student", "Project",
            "Algorithm", "Network", "Database", "Software", "Hardware",
            # Common phrases (cursive works better with connected text)
            "be doing", "the quick brown", "jumps over", "lazy dog",
            "Machine Learning", "Deep Learning", "Artificial Intelligence",
            "Computer Vision", "Natural Language", "Data Science",
            "Neural Networks", "Research Paper", "Student Project",
            # Full sentences (more realistic)
            "The rest comes in haunted dreams.",
            "You were supposed to protect me.",
            "Brother Karma got its revenge.",
            "I slept while you kicked my bones.",
            "Oh brother you were meant to defend.",
            "You were meant to be my friend.",
            "Please write clearly and neatly.",
            "The exam starts at nine AM.",
            "Submit your homework by Friday.",
            "Machine learning is fascinating.",
        ]
    
    (output_dir / 'images').mkdir(parents=True, exist_ok=True)
    (output_dir / 'labels').mkdir(parents=True, exist_ok=True)
    
    samples_created = 0
    
    for i in tqdm(range(num_samples), desc="Generating samples"):
        # Random parameters
        text = random.choice(texts)
        font_path = random.choice(available_fonts)
        font_size = random.randint(40, 80)
        
        # Create image
        img_width = random.randint(800, 1200)
        img_height = random.randint(400, 800)
        
        # Paper-like background
        bg_color = random.randint(235, 255)
        img = Image.new('RGB', (img_width, img_height), (bg_color, bg_color, bg_color))
        draw = ImageDraw.Draw(img)
        
        # Load font
        try:
            if font_path:
                font = ImageFont.truetype(font_path, font_size)
            else:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        # Text color (dark gray to black)
        text_color = random.randint(0, 50)
        
        # Random position
        x = random.randint(50, 200)
        y = random.randint(50, img_height // 2)
        
        # Draw text
        draw.text((x, y), text, fill=(text_color, text_color, text_color), font=font)
        
        # Get bounding box
        bbox = draw.textbbox((x, y), text, font=font)
        x1, y1, x2, y2 = bbox
        
        # Convert to numpy for augmentation
        img_np = np.array(img)
        
        # Add noise
        if random.random() > 0.5:
            noise = np.random.normal(0, 5, img_np.shape).astype(np.int16)
            img_np = np.clip(img_np.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        
        # Add blur (pen stroke effect)
        if random.random() > 0.5:
            kernel_size = random.choice([3, 5])
            img_np = cv2.GaussianBlur(img_np, (kernel_size, kernel_size), 0)
        
        # Save image
        img_path = output_dir / 'images' / f'handwriting_{i:05d}.jpg'
        cv2.imwrite(str(img_path), cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR))
        
        # Save YOLO label
        label_path = output_dir / 'labels' / f'handwriting_{i:05d}.txt'
        x_center = (x1 + x2) / 2 / img_width
        y_center = (y1 + y2) / 2 / img_height
        width = (x2 - x1) / img_width
        height = (y2 - y1) / img_height
        
        with open(label_path, 'w') as f:
            f.write(f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}")
        
        # Save OCR label
        samples_created += 1
    
    print(f"\n✅ Generated {samples_created} samples")
    return samples_created


def create_data_yaml(output_dir: Path):
    """Create YOLO data.yaml."""
    import yaml
    
    data = {
        'path': str(output_dir.absolute()),
        'train': 'images',
        'val': 'images',  # Same for now
        'nc': 1,
        'names': {0: 'handwriting'}
    }
    
    yaml_path = output_dir / 'data.yaml'
    with open(yaml_path, 'w') as f:
        yaml.dump(data, f, default_flow_style=False)
    
    print(f"✅ Created {yaml_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Download and prepare real handwriting datasets'
    )
    parser.add_argument('--output', '-o', type=str, default='./data/real_handwriting',
                       help='Output directory')
    parser.add_argument('--num-samples', '-n', type=int, default=2000,
                       help='Number of samples to generate')
    parser.add_argument('--quick', '-q', action='store_true',
                       help='Quick mode: 500 samples')
    
    args = parser.parse_args()
    
    output_dir = Path(args.output)
    
    if args.quick:
        args.num_samples = 500
    
    print("="*60)
    print(" Real Handwriting Dataset Generator")
    print("="*60)
    print(f"Output: {output_dir}")
    print(f"Samples: {args.num_samples}")
    
    # Generate dataset
    generate_handwriting_fonts_dataset(output_dir, args.num_samples)
    
    # Create data.yaml
    create_data_yaml(output_dir)
    
    print("\n" + "="*60)
    print(" Dataset Ready!")
    print("="*60)
    print(f"\nTrain with:")
    print(f"python scripts/train_detector.py --data {output_dir}/data.yaml --config configs/rtx3050.yaml")


if __name__ == "__main__":
    main()
