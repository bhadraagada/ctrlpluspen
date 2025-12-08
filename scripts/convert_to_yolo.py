"""
IAM Dataset to YOLO Format Converter
Converts IAM Handwriting Database to YOLO detection format

Dataset Structure Expected:
./data/iam/
├── words/                 # Word images (from words.tgz)
├── lines/                 # Line images (from lines.tgz)
├── xml/                   # XML annotations
├── ascii/                 # ASCII annotations
│   ├── words.txt         # Word-level ground truth
│   └── lines.txt         # Line-level ground truth
└── splits/               # Train/val/test splits
    ├── trainset.txt
    ├── validationset1.txt
    └── testset.txt

Output:
./data/yolo_format/
├── images/
│   ├── train/
│   └── val/
├── labels/
│   ├── train/
│   └── val/
└── data.yaml
"""

import os
import sys
import shutil
import random
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import xml.etree.ElementTree as ET

import cv2
import numpy as np
from tqdm import tqdm
import yaml


@dataclass
class BoundingBox:
    """Bounding box for handwritten text region."""
    x: int
    y: int
    width: int
    height: int
    text: str = ""
    
    def to_yolo(self, img_width: int, img_height: int) -> str:
        """Convert to YOLO format: class x_center y_center width height (normalized)."""
        x_center = (self.x + self.width / 2) / img_width
        y_center = (self.y + self.height / 2) / img_height
        w = self.width / img_width
        h = self.height / img_height
        
        # Clamp to [0, 1]
        x_center = max(0, min(1, x_center))
        y_center = max(0, min(1, y_center))
        w = max(0, min(1, w))
        h = max(0, min(1, h))
        
        # Class 0 = handwriting
        return f"0 {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}"


def parse_iam_words_txt(words_file: Path) -> Dict[str, dict]:
    """
    Parse IAM words.txt file.
    
    Format: word_id ok/err graylevel x y w h grammar_tag transcription
    Example: a01-000u-00-00 ok 154 408 768 27 51 AT A
    """
    words = {}
    
    with open(words_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            parts = line.split()
            if len(parts) < 9:
                continue
            
            word_id = parts[0]
            status = parts[1]
            
            # Skip erroneous segmentations
            if status != 'ok':
                continue
            
            try:
                graylevel = int(parts[2])
                x, y, w, h = int(parts[3]), int(parts[4]), int(parts[5]), int(parts[6])
                grammar_tag = parts[7]
                transcription = parts[8] if len(parts) > 8 else ""
                
                # Handle transcriptions with spaces (joined with |)
                if '|' in transcription:
                    transcription = transcription.replace('|', ' ')
                
                words[word_id] = {
                    'x': x, 'y': y, 'w': w, 'h': h,
                    'text': transcription,
                    'graylevel': graylevel,
                    'grammar_tag': grammar_tag
                }
            except ValueError:
                continue
    
    return words


def parse_iam_lines_txt(lines_file: Path) -> Dict[str, dict]:
    """
    Parse IAM lines.txt file.
    
    Format: line_id ok/err graylevel num_components x y w h transcription
    """
    lines = {}
    
    with open(lines_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            parts = line.split()
            if len(parts) < 9:
                continue
            
            line_id = parts[0]
            status = parts[1]
            
            if status != 'ok':
                continue
            
            try:
                graylevel = int(parts[2])
                num_components = int(parts[3])
                x, y, w, h = int(parts[4]), int(parts[5]), int(parts[6]), int(parts[7])
                transcription = ' '.join(parts[8:]) if len(parts) > 8 else ""
                transcription = transcription.replace('|', ' ')
                
                lines[line_id] = {
                    'x': x, 'y': y, 'w': w, 'h': h,
                    'text': transcription,
                    'num_components': num_components
                }
            except ValueError:
                continue
    
    return lines


def parse_xml_annotation(xml_file: Path) -> List[BoundingBox]:
    """Parse IAM XML annotation file for a form."""
    boxes = []
    
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        # Find all word elements
        for word in root.iter('word'):
            x = int(word.get('x', 0))
            y = int(word.get('y', 0))
            w = int(word.get('w', 0))
            h = int(word.get('h', 0))
            text = word.get('text', '')
            
            if w > 0 and h > 0:
                boxes.append(BoundingBox(x, y, w, h, text))
    
    except Exception as e:
        print(f"Error parsing {xml_file}: {e}")
    
    return boxes


def get_image_path_for_word(word_id: str, words_dir: Path) -> Optional[Path]:
    """
    Get image path from word ID.
    Word ID format: a01-000u-00-00 -> a01/a01-000u/a01-000u-00-00.png
    """
    parts = word_id.split('-')
    if len(parts) < 4:
        return None
    
    folder1 = parts[0]  # a01
    folder2 = f"{parts[0]}-{parts[1]}"  # a01-000u
    filename = f"{word_id}.png"
    
    img_path = words_dir / folder1 / folder2 / filename
    return img_path if img_path.exists() else None


def get_image_path_for_line(line_id: str, lines_dir: Path) -> Optional[Path]:
    """
    Get image path from line ID.
    Line ID format: a01-000u-00 -> a01/a01-000u/a01-000u-00.png
    """
    parts = line_id.split('-')
    if len(parts) < 3:
        return None
    
    folder1 = parts[0]
    folder2 = f"{parts[0]}-{parts[1]}"
    filename = f"{line_id}.png"
    
    img_path = lines_dir / folder1 / folder2 / filename
    return img_path if img_path.exists() else None


def load_split_file(split_file: Path) -> List[str]:
    """Load form IDs from split file."""
    forms = []
    with open(split_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                forms.append(line)
    return forms


def create_synthetic_document_annotations(
    lines_dir: Path,
    lines_data: Dict[str, dict],
    output_dir: Path,
    split: str,
    form_ids: List[str],
    max_samples: Optional[int] = None
) -> int:
    """
    For IAM lines dataset, each line image IS the detection target.
    We create a single bounding box covering the entire line.
    This is suitable for training word/line detection on document images.
    
    For real document-level detection, you would need form images with 
    multiple lines annotated.
    """
    images_dir = output_dir / 'images' / split
    labels_dir = output_dir / 'labels' / split
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)
    
    count = 0
    processed_lines = []
    
    # Filter lines by form IDs
    for line_id, data in lines_data.items():
        # Extract form ID (first two parts: a01-000u)
        parts = line_id.split('-')
        if len(parts) >= 2:
            form_id = f"{parts[0]}-{parts[1]}"
            if form_id in form_ids:
                processed_lines.append((line_id, data))
    
    if max_samples:
        processed_lines = processed_lines[:max_samples]
    
    for line_id, data in tqdm(processed_lines, desc=f"Processing {split}"):
        img_path = get_image_path_for_line(line_id, lines_dir)
        if not img_path:
            continue
        
        try:
            img = cv2.imread(str(img_path))
            if img is None:
                continue
            
            h, w = img.shape[:2]
            
            # The entire line image is the text region
            # Create a box with small padding
            padding = 5
            box = BoundingBox(padding, padding, w - 2*padding, h - 2*padding, data['text'])
            
            # Save image
            out_img_path = images_dir / f"{line_id}.jpg"
            cv2.imwrite(str(out_img_path), img)
            
            # Save label
            out_label_path = labels_dir / f"{line_id}.txt"
            yolo_line = box.to_yolo(w, h)
            with open(out_label_path, 'w') as f:
                f.write(yolo_line + '\n')
            
            count += 1
            
        except Exception as e:
            print(f"Error processing {line_id}: {e}")
            continue
    
    return count


def create_word_level_dataset(
    words_dir: Path,
    words_data: Dict[str, dict],
    output_dir: Path,
    split: str,
    form_ids: List[str],
    max_samples: Optional[int] = None
) -> int:
    """
    Create dataset from individual word images.
    Each word image becomes a training sample with full-image bounding box.
    """
    images_dir = output_dir / 'images' / split
    labels_dir = output_dir / 'labels' / split
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)
    
    count = 0
    processed_words = []
    
    for word_id, data in words_data.items():
        parts = word_id.split('-')
        if len(parts) >= 2:
            form_id = f"{parts[0]}-{parts[1]}"
            if form_id in form_ids:
                processed_words.append((word_id, data))
    
    if max_samples:
        random.shuffle(processed_words)
        processed_words = processed_words[:max_samples]
    
    for word_id, data in tqdm(processed_words, desc=f"Processing {split} words"):
        img_path = get_image_path_for_word(word_id, words_dir)
        if not img_path:
            continue
        
        try:
            img = cv2.imread(str(img_path))
            if img is None:
                continue
            
            h, w = img.shape[:2]
            
            # Minimum size check
            if w < 10 or h < 10:
                continue
            
            # Full image is the word region
            box = BoundingBox(0, 0, w, h, data['text'])
            
            # Save
            out_img_path = images_dir / f"{word_id}.jpg"
            cv2.imwrite(str(out_img_path), img)
            
            out_label_path = labels_dir / f"{word_id}.txt"
            with open(out_label_path, 'w') as f:
                f.write(box.to_yolo(w, h) + '\n')
            
            count += 1
            
        except Exception as e:
            continue
    
    return count


def create_data_yaml(output_dir: Path, nc: int = 1):
    """Create YOLO data.yaml configuration file."""
    data_yaml = {
        'path': str(output_dir.absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'test': 'images/test',
        'nc': nc,
        'names': {0: 'handwriting'}
    }
    
    yaml_path = output_dir / 'data.yaml'
    with open(yaml_path, 'w') as f:
        yaml.dump(data_yaml, f, default_flow_style=False)
    
    print(f"Created {yaml_path}")
    return yaml_path


def validate_yolo_format(output_dir: Path) -> bool:
    """Validate converted YOLO dataset."""
    print("\n" + "="*50)
    print("Validating YOLO Format Dataset")
    print("="*50)
    
    errors = []
    warnings = []
    
    for split in ['train', 'val']:
        images_dir = output_dir / 'images' / split
        labels_dir = output_dir / 'labels' / split
        
        if not images_dir.exists():
            errors.append(f"Missing: {images_dir}")
            continue
        
        image_files = list(images_dir.glob('*.jpg')) + list(images_dir.glob('*.png'))
        label_files = list(labels_dir.glob('*.txt'))
        
        print(f"\n{split}:")
        print(f"  Images: {len(image_files)}")
        print(f"  Labels: {len(label_files)}")
        
        # Check correspondence
        image_stems = {f.stem for f in image_files}
        label_stems = {f.stem for f in label_files}
        
        missing_labels = image_stems - label_stems
        missing_images = label_stems - image_stems
        
        if missing_labels:
            warnings.append(f"{split}: {len(missing_labels)} images without labels")
        if missing_images:
            warnings.append(f"{split}: {len(missing_images)} labels without images")
        
        # Validate label format
        invalid_labels = 0
        for label_file in label_files[:100]:  # Check first 100
            with open(label_file, 'r') as f:
                for line_num, line in enumerate(f, 1):
                    parts = line.strip().split()
                    if len(parts) != 5:
                        invalid_labels += 1
                        continue
                    try:
                        cls = int(parts[0])
                        coords = [float(x) for x in parts[1:]]
                        if not all(0 <= c <= 1 for c in coords):
                            invalid_labels += 1
                    except ValueError:
                        invalid_labels += 1
        
        if invalid_labels:
            errors.append(f"{split}: {invalid_labels} invalid label entries")
    
    # Print results
    if warnings:
        print("\n⚠️  Warnings:")
        for w in warnings:
            print(f"  - {w}")
    
    if errors:
        print("\n❌ Errors:")
        for e in errors:
            print(f"  - {e}")
        return False
    
    print("\n✅ Dataset validation passed!")
    return True


def create_sample_dataset(output_dir: Path, num_samples: int = 100):
    """
    Create a minimal sample dataset for quick testing.
    Uses synthetic bounding boxes on blank images.
    Only for pipeline validation - NOT for actual training.
    """
    print(f"\n⚠️  Creating SAMPLE dataset ({num_samples} images)")
    print("   This is for pipeline testing only!")
    print("   For real training, use actual IAM data.")
    
    for split in ['train', 'val']:
        n = int(num_samples * (0.8 if split == 'train' else 0.2))
        
        images_dir = output_dir / 'images' / split
        labels_dir = output_dir / 'labels' / split
        images_dir.mkdir(parents=True, exist_ok=True)
        labels_dir.mkdir(parents=True, exist_ok=True)
        
        for i in tqdm(range(n), desc=f"Creating {split} samples"):
            # Create a simple image with noise (simulating paper texture)
            h, w = random.randint(200, 400), random.randint(400, 800)
            img = np.ones((h, w, 3), dtype=np.uint8) * 245
            img = img + np.random.randint(-10, 10, img.shape, dtype=np.int16)
            img = np.clip(img, 0, 255).astype(np.uint8)
            
            # Add some dark horizontal strokes (simulating text)
            num_strokes = random.randint(1, 5)
            labels = []
            
            for j in range(num_strokes):
                y1 = random.randint(20, h - 40)
                x1 = random.randint(20, w - 100)
                sw = random.randint(50, min(200, w - x1 - 20))
                sh = random.randint(15, 35)
                
                # Draw stroke
                cv2.rectangle(img, (x1, y1), (x1 + sw, y1 + sh), 
                             (random.randint(20, 80),) * 3, -1)
                
                # Add some texture
                noise = np.random.randint(-20, 20, (sh, sw, 3), dtype=np.int16)
                img[y1:y1+sh, x1:x1+sw] = np.clip(
                    img[y1:y1+sh, x1:x1+sw].astype(np.int16) + noise, 0, 255
                ).astype(np.uint8)
                
                # YOLO format
                x_center = (x1 + sw/2) / w
                y_center = (y1 + sh/2) / h
                box_w = sw / w
                box_h = sh / h
                labels.append(f"0 {x_center:.6f} {y_center:.6f} {box_w:.6f} {box_h:.6f}")
            
            # Save
            img_path = images_dir / f"sample_{split}_{i:04d}.jpg"
            cv2.imwrite(str(img_path), img)
            
            label_path = labels_dir / f"sample_{split}_{i:04d}.txt"
            with open(label_path, 'w') as f:
                f.write('\n'.join(labels))
    
    create_data_yaml(output_dir)
    print(f"\n✅ Sample dataset created at {output_dir}")


def main():
    parser = argparse.ArgumentParser(description='Convert IAM dataset to YOLO format')
    parser.add_argument('--input', '-i', type=str, default='./data/iam',
                       help='Path to IAM dataset root')
    parser.add_argument('--output', '-o', type=str, default='./data/yolo_format',
                       help='Output directory for YOLO format')
    parser.add_argument('--mode', choices=['words', 'lines', 'sample'], default='lines',
                       help='Conversion mode: words, lines, or sample (for testing)')
    parser.add_argument('--max-samples', type=int, default=None,
                       help='Maximum samples per split (for quick testing)')
    parser.add_argument('--create-sample', action='store_true',
                       help='Create a minimal sample dataset for pipeline testing')
    parser.add_argument('--sample-size', type=int, default=100,
                       help='Number of samples for sample dataset')
    
    args = parser.parse_args()
    
    input_dir = Path(args.input)
    output_dir = Path(args.output)
    
    # Quick sample mode for pipeline testing
    if args.create_sample:
        create_sample_dataset(output_dir, args.sample_size)
        validate_yolo_format(output_dir)
        return
    
    # Check IAM dataset exists
    if not input_dir.exists():
        print(f"❌ IAM dataset not found at {input_dir}")
        print("\nTo download IAM dataset:")
        print("1. Register at https://fki.tic.heia-fr.ch/databases/iam-handwriting-database")
        print("2. Download words.tgz, lines.tgz, and ascii.tgz")
        print("3. Extract to ./data/iam/")
        print("\nAlternatively, create a sample dataset for testing:")
        print(f"  python {__file__} --create-sample --sample-size 100")
        sys.exit(1)
    
    print(f"Converting IAM dataset from {input_dir}")
    print(f"Output directory: {output_dir}")
    print(f"Mode: {args.mode}")
    
    # Load annotations
    words_file = input_dir / 'ascii' / 'words.txt'
    lines_file = input_dir / 'ascii' / 'lines.txt'
    
    if args.mode == 'words' and words_file.exists():
        print(f"Loading word annotations from {words_file}")
        annotations = parse_iam_words_txt(words_file)
        data_dir = input_dir / 'words'
    elif args.mode == 'lines' and lines_file.exists():
        print(f"Loading line annotations from {lines_file}")
        annotations = parse_iam_lines_txt(lines_file)
        data_dir = input_dir / 'lines'
    else:
        print(f"❌ Annotation file not found for mode '{args.mode}'")
        print("Creating sample dataset instead...")
        create_sample_dataset(output_dir, args.sample_size)
        validate_yolo_format(output_dir)
        return
    
    print(f"Loaded {len(annotations)} annotations")
    
    # Load splits (or create random splits)
    splits_dir = input_dir / 'splits'
    if splits_dir.exists():
        train_forms = load_split_file(splits_dir / 'trainset.txt')
        val_forms = load_split_file(splits_dir / 'validationset1.txt')
        test_forms = load_split_file(splits_dir / 'testset.txt')
    else:
        # Create random splits from available form IDs
        all_forms = set()
        for ann_id in annotations.keys():
            parts = ann_id.split('-')
            if len(parts) >= 2:
                all_forms.add(f"{parts[0]}-{parts[1]}")
        
        all_forms = list(all_forms)
        random.shuffle(all_forms)
        n = len(all_forms)
        train_forms = all_forms[:int(n*0.8)]
        val_forms = all_forms[int(n*0.8):int(n*0.9)]
        test_forms = all_forms[int(n*0.9):]
    
    print(f"Splits - Train: {len(train_forms)}, Val: {len(val_forms)}, Test: {len(test_forms)}")
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Convert based on mode
    if args.mode == 'words':
        train_count = create_word_level_dataset(
            data_dir, annotations, output_dir, 'train', train_forms, args.max_samples
        )
        val_count = create_word_level_dataset(
            data_dir, annotations, output_dir, 'val', val_forms, 
            args.max_samples // 5 if args.max_samples else None
        )
    else:  # lines
        train_count = create_synthetic_document_annotations(
            data_dir, annotations, output_dir, 'train', train_forms, args.max_samples
        )
        val_count = create_synthetic_document_annotations(
            data_dir, annotations, output_dir, 'val', val_forms,
            args.max_samples // 5 if args.max_samples else None
        )
    
    print(f"\nConverted: {train_count} train, {val_count} val images")
    
    # Create data.yaml
    create_data_yaml(output_dir)
    
    # Validate
    validate_yolo_format(output_dir)
    
    print("\n✅ Conversion complete!")
    print(f"Dataset ready at: {output_dir}")
    print(f"\nNext steps:")
    print(f"  python scripts/validate_dataset.py --data {output_dir} --visualize")
    print(f"  python scripts/train_detector.py --data {output_dir}/data.yaml")


if __name__ == "__main__":
    main()
