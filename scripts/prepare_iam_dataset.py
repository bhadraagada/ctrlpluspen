"""
IAM Handwriting Database - Automatic Downloader and Converter
Downloads IAM dataset with credentials and converts to YOLO format

IAM Database contains:
- 1,539 pages of scanned text (real handwriting)
- 5,685 isolated text lines  
- 13,353 isolated words
- 115,320 isolated characters
- Written by 657 different writers
- Both cursive and print styles

Registration: https://fki.tic.heia-fr.ch/databases/iam-handwriting-database
After registration, you'll receive download credentials via email.
"""

import os
import sys
import argparse
import requests
from pathlib import Path
from typing import List, Dict, Tuple
import xml.etree.ElementTree as ET
from tqdm import tqdm
import cv2
import numpy as np
import yaml


def download_with_auth(url: str, dest: Path, username: str, password: str):
    """Download file with HTTP basic authentication."""
    print(f"Downloading: {url}")
    
    response = requests.get(url, auth=(username, password), stream=True)
    
    if response.status_code == 401:
        print("❌ Authentication failed. Check your username/password.")
        return False
    elif response.status_code != 200:
        print(f"❌ Download failed: HTTP {response.status_code}")
        return False
    
    total = int(response.headers.get('content-length', 0))
    dest.parent.mkdir(parents=True, exist_ok=True)
    
    with open(dest, 'wb') as f, tqdm(
        desc=dest.name,
        total=total,
        unit='B',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for chunk in response.iter_content(chunk_size=8192):
            size = f.write(chunk)
            bar.update(size)
    
    print(f"✅ Downloaded: {dest}")
    return True


def download_iam_dataset(data_dir: Path, username: str, password: str):
    """
    Download IAM Handwriting Database.
    
    You need credentials from: https://fki.tic.heia-fr.ch/databases/iam-handwriting-database
    """
    base_url = "https://fki.tic.heia-fr.ch/DBs/iamDB/data"
    
    files_to_download = [
        ("lines/lines.tgz", "lines.tgz"),           # Text line images
        ("words/words.tgz", "words.tgz"),           # Word images  
        ("xml/xml.tgz", "xml.tgz"),                 # Ground truth annotations
        ("ascii/lines.txt", "lines.txt"),           # Line-level annotations
    ]
    
    print("="*60)
    print(" Downloading IAM Handwriting Database")
    print("="*60)
    
    for url_path, filename in files_to_download:
        url = f"{base_url}/{url_path}"
        dest = data_dir / filename
        
        if dest.exists():
            print(f"✓ Already downloaded: {filename}")
            continue
        
        success = download_with_auth(url, dest, username, password)
        if not success:
            return False
    
    print("\n✅ All files downloaded!")
    return True


def extract_archives(data_dir: Path):
    """Extract downloaded tar.gz archives."""
    import tarfile
    
    print("\n" + "="*60)
    print(" Extracting Archives")
    print("="*60)
    
    archives = ['lines.tgz', 'words.tgz', 'xml.tgz']
    
    for archive_name in archives:
        archive_path = data_dir / archive_name
        
        if not archive_path.exists():
            print(f"⚠️  Not found: {archive_name}")
            continue
        
        extract_dir = data_dir / archive_name.replace('.tgz', '')
        
        if extract_dir.exists():
            print(f"✓ Already extracted: {archive_name}")
            continue
        
        print(f"Extracting: {archive_name}")
        with tarfile.open(archive_path, 'r:gz') as tar:
            tar.extractall(data_dir)
        
        print(f"✅ Extracted: {archive_name}")
    
    print("\n✅ All archives extracted!")


def parse_iam_lines_file(lines_file: Path) -> Dict[str, Dict]:
    """
    Parse IAM lines.txt annotation file.
    
    Format: line_id status graylevel num_components x y w h grammar_tag transcript
    """
    annotations = {}
    
    with open(lines_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('#'):
                continue
            
            parts = line.split(' ')
            
            if len(parts) < 9:
                continue
            
            line_id = parts[0]
            status = parts[1]
            
            # Skip failed segmentation
            if status == 'err':
                continue
            
            x, y, w, h = map(int, parts[4:8])
            transcript = ' '.join(parts[8:])
            
            annotations[line_id] = {
                'id': line_id,
                'box': (x, y, w, h),
                'text': transcript,
                'status': status,
            }
    
    return annotations


def convert_iam_to_yolo(
    data_dir: Path,
    output_dir: Path,
    split: str = 'lines',  # 'lines' or 'words'
    train_ratio: float = 0.8,
):
    """
    Convert IAM dataset to YOLO format.
    
    Args:
        data_dir: IAM dataset directory
        output_dir: Output directory for YOLO format
        split: Use 'lines' or 'words' level
        train_ratio: Training set ratio
    """
    print("\n" + "="*60)
    print(f" Converting IAM to YOLO Format ({split})")
    print("="*60)
    
    # Parse annotations
    lines_file = data_dir / 'lines.txt'
    if not lines_file.exists():
        print(f"❌ Annotation file not found: {lines_file}")
        return False
    
    annotations = parse_iam_lines_file(lines_file)
    print(f"✅ Loaded {len(annotations)} annotations")
    
    # Find image files
    images_dir = data_dir / split
    if not images_dir.exists():
        print(f"❌ Images directory not found: {images_dir}")
        return False
    
    # Create output directories
    for subset in ['train', 'val']:
        (output_dir / 'images' / subset).mkdir(parents=True, exist_ok=True)
        (output_dir / 'labels' / subset).mkdir(parents=True, exist_ok=True)
    
    (output_dir / 'ocr_labels').mkdir(parents=True, exist_ok=True)
    
    # Process all images
    all_images = list(images_dir.rglob('*.png'))
    print(f"Found {len(all_images)} images")
    
    ocr_labels = []
    train_count = 0
    val_count = 0
    
    for img_path in tqdm(all_images, desc="Converting"):
        # Get line ID from filename (e.g., a01-000u-00.png -> a01-000u-00)
        line_id = img_path.stem
        
        # Get annotation
        if line_id not in annotations:
            continue
        
        ann = annotations[line_id]
        
        # Read image to get dimensions
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        
        h, w = img.shape[:2]
        
        # Decide train/val split (deterministic based on ID)
        is_train = hash(line_id) % 100 < (train_ratio * 100)
        subset = 'train' if is_train else 'val'
        
        # Copy image
        out_img_path = output_dir / 'images' / subset / f"{line_id}.jpg"
        cv2.imwrite(str(out_img_path), img)
        
        # Create YOLO label (single box covering the whole line)
        # IAM boxes are absolute (x, y, w, h), convert to YOLO (cx, cy, w, h) normalized
        x, y, box_w, box_h = ann['box']
        
        # Handle edge cases where box extends beyond image
        x = max(0, min(x, w-1))
        y = max(0, min(y, h-1))
        box_w = min(box_w, w - x)
        box_h = min(box_h, h - y)
        
        # Convert to YOLO format
        x_center = (x + box_w / 2) / w
        y_center = (y + box_h / 2) / h
        width_norm = box_w / w
        height_norm = box_h / h
        
        # Clamp to [0, 1]
        x_center = max(0, min(1, x_center))
        y_center = max(0, min(1, y_center))
        width_norm = max(0, min(1, width_norm))
        height_norm = max(0, min(1, height_norm))
        
        # Write YOLO label
        label_path = output_dir / 'labels' / subset / f"{line_id}.txt"
        with open(label_path, 'w') as f:
            f.write(f"0 {x_center:.6f} {y_center:.6f} {width_norm:.6f} {height_norm:.6f}\n")
        
        # Save OCR label
        ocr_labels.append({
            'image': f"{subset}/{line_id}.jpg",
            'text': ann['text'],
            'box': [x, y, x + box_w, y + box_h],
        })
        
        if is_train:
            train_count += 1
        else:
            val_count += 1
    
    print(f"\n✅ Converted:")
    print(f"   Training: {train_count} images")
    print(f"   Validation: {val_count} images")
    
    # Save OCR labels
    import json
    ocr_file = output_dir / 'ocr_labels' / 'labels.json'
    with open(ocr_file, 'w', encoding='utf-8') as f:
        json.dump(ocr_labels, f, indent=2, ensure_ascii=False)
    
    print(f"✅ OCR labels saved: {ocr_file}")
    
    # Create data.yaml
    data_yaml = {
        'path': str(output_dir.absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'nc': 1,
        'names': {0: 'handwriting'}
    }
    
    yaml_path = output_dir / 'data.yaml'
    with open(yaml_path, 'w') as f:
        yaml.dump(data_yaml, f, default_flow_style=False)
    
    print(f"✅ Created: {yaml_path}")
    
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Download and prepare IAM Handwriting Database',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--data-dir', type=str, default='./data/iam',
                       help='Directory to store IAM dataset')
    parser.add_argument('--output', '-o', type=str, default='./data/iam_yolo',
                       help='Output directory for YOLO format')
    parser.add_argument('--username', '-u', type=str, default=None,
                       help='IAM database username (from registration email)')
    parser.add_argument('--password', '-p', type=str, default=None,
                       help='IAM database password')
    parser.add_argument('--skip-download', action='store_true',
                       help='Skip download, only convert existing data')
    parser.add_argument('--split', type=str, default='lines',
                       choices=['lines', 'words'],
                       help='Use line-level or word-level images')
    
    args = parser.parse_args()
    
    data_dir = Path(args.data_dir)
    output_dir = Path(args.output)
    
    print("="*60)
    print(" IAM Handwriting Database Preparation")
    print("="*60)
    print(f"Data directory: {data_dir}")
    print(f"Output directory: {output_dir}")
    print(f"Split: {args.split}")
    
    # Download if needed
    if not args.skip_download:
        if not args.username or not args.password:
            print("\n❌ IAM credentials required!")
            print("\n📝 To get credentials:")
            print("1. Register at: https://fki.tic.heia-fr.ch/databases/iam-handwriting-database")
            print("2. Wait for confirmation email with username/password")
            print("3. Run: python scripts/prepare_iam_dataset.py -u <username> -p <password>")
            print("\nOr use --skip-download if you already have the data")
            return
        
        success = download_iam_dataset(data_dir, args.username, args.password)
        if not success:
            return
        
        extract_archives(data_dir)
    
    # Convert to YOLO format
    convert_iam_to_yolo(data_dir, output_dir, args.split)
    
    print("\n" + "="*60)
    print(" ✅ IAM Dataset Ready!")
    print("="*60)
    print(f"\nTrain with:")
    print(f"python scripts/train_detector.py --data {output_dir}/data.yaml --config configs/rtx3050.yaml --epochs 100")
    print(f"\nOr quick test:")
    print(f"python scripts/train_detector.py --data {output_dir}/data.yaml --config configs/quick_test.yaml")


if __name__ == "__main__":
    main()
