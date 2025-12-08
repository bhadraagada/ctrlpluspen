"""
EMNIST Dataset to YOLO Format Converter
Converts EMNIST (Extended MNIST) for handwriting detection and OCR

EMNIST is freely available via torchvision - no registration needed!

Dataset splits available:
- 'byclass': 62 classes (0-9, A-Z, a-z)
- 'bymerge': 47 classes (merged similar chars)
- 'balanced': 47 classes, balanced
- 'letters': 26 classes (A-Z only)
- 'digits': 10 classes (0-9 only)
- 'mnist': Original MNIST

This script:
1. Downloads EMNIST automatically
2. Creates synthetic document images with multiple characters
3. Generates YOLO format annotations for detection training
4. Saves character labels for OCR training
"""

import os
import sys
import random
import argparse
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

import cv2
import numpy as np
from tqdm import tqdm
import yaml

# Try to import torchvision
try:
    import torch
    from torchvision import datasets, transforms
    TORCHVISION_AVAILABLE = True
except ImportError:
    TORCHVISION_AVAILABLE = False
    print("Warning: torchvision not available. Install with: uv pip install torchvision")


# EMNIST class mappings
EMNIST_BYCLASS_MAPPING = {
    **{i: str(i) for i in range(10)},  # 0-9
    **{i + 10: chr(ord('A') + i) for i in range(26)},  # A-Z (10-35)
    **{i + 36: chr(ord('a') + i) for i in range(26)},  # a-z (36-61)
}

EMNIST_LETTERS_MAPPING = {
    i: chr(ord('A') + i) for i in range(26)  # A-Z (1-26, but 0-indexed after load)
}

EMNIST_DIGITS_MAPPING = {
    i: str(i) for i in range(10)  # 0-9
}


@dataclass
class CharacterBox:
    """A character with its bounding box in document space."""
    x: int
    y: int
    width: int
    height: int
    char: str
    char_image: np.ndarray


def download_emnist(data_dir: Path, split: str = 'byclass') -> Tuple[any, any]:
    """
    Download EMNIST dataset using torchvision.
    
    Args:
        data_dir: Directory to save dataset
        split: EMNIST split ('byclass', 'letters', 'digits', 'balanced', 'mnist')
    
    Returns:
        (train_dataset, test_dataset)
    """
    if not TORCHVISION_AVAILABLE:
        raise ImportError("torchvision required. Install with: uv pip install torchvision")
    
    print(f"Downloading EMNIST ({split}) to {data_dir}...")
    print("This may take a few minutes on first run...")
    
    transform = transforms.Compose([
        transforms.ToTensor(),
    ])
    
    train_dataset = datasets.EMNIST(
        root=str(data_dir),
        split=split,
        train=True,
        download=True,
        transform=transform,
    )
    
    test_dataset = datasets.EMNIST(
        root=str(data_dir),
        split=split,
        train=False,
        download=True,
        transform=transform,
    )
    
    print(f"✅ Downloaded {len(train_dataset)} training samples")
    print(f"✅ Downloaded {len(test_dataset)} test samples")
    
    return train_dataset, test_dataset


def get_char_mapping(split: str) -> Dict[int, str]:
    """Get character mapping for EMNIST split."""
    if split == 'byclass':
        return EMNIST_BYCLASS_MAPPING
    elif split == 'letters':
        return EMNIST_LETTERS_MAPPING
    elif split in ['digits', 'mnist']:
        return EMNIST_DIGITS_MAPPING
    elif split in ['balanced', 'bymerge']:
        # Simplified mapping for balanced/bymerge
        return EMNIST_BYCLASS_MAPPING
    else:
        return EMNIST_BYCLASS_MAPPING


def tensor_to_image(tensor: 'torch.Tensor') -> np.ndarray:
    """Convert EMNIST tensor to numpy image."""
    # EMNIST images need to be transposed and flipped
    img = tensor.numpy().squeeze()
    img = np.transpose(img)  # EMNIST is transposed
    img = np.flip(img, axis=1)  # Flip horizontally
    img = (img * 255).astype(np.uint8)
    return img


def create_document_image(
    characters: List[Tuple[np.ndarray, str]],
    doc_width: int = 640,
    doc_height: int = 480,
    chars_per_line: int = 8,
    num_lines: int = 3,
    char_size: Tuple[int, int] = (40, 50),
    noise_level: float = 0.1,
    padding: int = 30,
) -> Tuple[np.ndarray, List[CharacterBox]]:
    """
    Create a synthetic document image with multiple characters.
    
    Args:
        characters: List of (image, char_label) tuples
        doc_width: Document width
        doc_height: Document height
        chars_per_line: Characters per line
        num_lines: Number of lines
        char_size: (width, height) of each character
        noise_level: Background noise level
        padding: Document padding
    
    Returns:
        (document_image, list of CharacterBox)
    """
    # Create document background (paper-like)
    doc = np.ones((doc_height, doc_width), dtype=np.uint8) * random.randint(240, 255)
    
    # Add subtle noise
    if noise_level > 0:
        noise = np.random.normal(0, noise_level * 20, doc.shape).astype(np.int16)
        doc = np.clip(doc.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    char_boxes = []
    char_idx = 0
    
    char_w, char_h = char_size
    line_spacing = char_h + random.randint(10, 20)
    char_spacing = char_w + random.randint(2, 8)
    
    for line in range(num_lines):
        if char_idx >= len(characters):
            break
        
        # Random number of chars in this line
        n_chars = min(
            random.randint(chars_per_line - 2, chars_per_line + 2),
            len(characters) - char_idx
        )
        
        y_base = padding + line * line_spacing
        x_base = padding + random.randint(0, 20)
        
        for i in range(n_chars):
            if char_idx >= len(characters):
                break
            
            char_img, char_label = characters[char_idx]
            char_idx += 1
            
            # Resize character
            char_resized = cv2.resize(char_img, (char_w, char_h))
            
            # Random position variation
            x = x_base + i * char_spacing + random.randint(-3, 3)
            y = y_base + random.randint(-5, 5)
            
            # Check bounds
            if x + char_w > doc_width - padding or y + char_h > doc_height - padding:
                continue
            
            # Place character (blend with background)
            roi = doc[y:y+char_h, x:x+char_w]
            # Invert char image (EMNIST is white on black, we want black on white)
            char_inv = 255 - char_resized
            # Blend
            alpha = char_inv.astype(np.float32) / 255.0
            blended = (roi * (1 - alpha) + char_inv * alpha * 0.1 + roi * alpha * 0.1).astype(np.uint8)
            # Make darker where character is
            final = np.minimum(roi, char_inv)
            doc[y:y+char_h, x:x+char_w] = final
            
            char_boxes.append(CharacterBox(
                x=x, y=y, width=char_w, height=char_h,
                char=char_label, char_image=char_resized
            ))
    
    # Convert to BGR
    doc_bgr = cv2.cvtColor(doc, cv2.COLOR_GRAY2BGR)
    
    return doc_bgr, char_boxes


def create_word_boxes(
    char_boxes: List[CharacterBox],
    merge_threshold: int = 15,
) -> List[Tuple[List[int], str]]:
    """
    Merge character boxes into word/group boxes.
    
    Args:
        char_boxes: List of character boxes
        merge_threshold: Max horizontal gap to merge
    
    Returns:
        List of (box [x1,y1,x2,y2], text) tuples
    """
    if not char_boxes:
        return []
    
    # Sort by y then x
    sorted_chars = sorted(char_boxes, key=lambda c: (c.y, c.x))
    
    # Group into lines
    lines = []
    current_line = [sorted_chars[0]]
    
    for char in sorted_chars[1:]:
        # Check if same line (y overlap)
        last_char = current_line[-1]
        y_overlap = min(last_char.y + last_char.height, char.y + char.height) - \
                   max(last_char.y, char.y)
        min_height = min(last_char.height, char.height)
        
        if y_overlap > min_height * 0.5:
            current_line.append(char)
        else:
            lines.append(current_line)
            current_line = [char]
    lines.append(current_line)
    
    # Merge into words within each line
    word_boxes = []
    
    for line in lines:
        line_sorted = sorted(line, key=lambda c: c.x)
        
        current_word = [line_sorted[0]]
        
        for char in line_sorted[1:]:
            last_char = current_word[-1]
            gap = char.x - (last_char.x + last_char.width)
            
            if gap < merge_threshold:
                current_word.append(char)
            else:
                # Save current word
                x1 = min(c.x for c in current_word)
                y1 = min(c.y for c in current_word)
                x2 = max(c.x + c.width for c in current_word)
                y2 = max(c.y + c.height for c in current_word)
                text = ''.join(c.char for c in current_word)
                word_boxes.append(([x1, y1, x2, y2], text))
                
                current_word = [char]
        
        # Don't forget last word
        if current_word:
            x1 = min(c.x for c in current_word)
            y1 = min(c.y for c in current_word)
            x2 = max(c.x + c.width for c in current_word)
            y2 = max(c.y + c.height for c in current_word)
            text = ''.join(c.char for c in current_word)
            word_boxes.append(([x1, y1, x2, y2], text))
    
    return word_boxes


def box_to_yolo(box: List[int], img_width: int, img_height: int) -> str:
    """Convert box to YOLO format."""
    x1, y1, x2, y2 = box
    x_center = (x1 + x2) / 2 / img_width
    y_center = (y1 + y2) / 2 / img_height
    width = (x2 - x1) / img_width
    height = (y2 - y1) / img_height
    
    # Clamp to [0, 1]
    x_center = max(0, min(1, x_center))
    y_center = max(0, min(1, y_center))
    width = max(0, min(1, width))
    height = max(0, min(1, height))
    
    return f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"


def create_yolo_dataset(
    train_dataset,
    test_dataset,
    output_dir: Path,
    char_mapping: Dict[int, str],
    num_train_docs: int = 1000,
    num_val_docs: int = 200,
    doc_width: int = 640,
    doc_height: int = 480,
    chars_per_doc: int = 30,
):
    """
    Create YOLO format dataset from EMNIST.
    
    Args:
        train_dataset: EMNIST training dataset
        test_dataset: EMNIST test dataset
        output_dir: Output directory
        char_mapping: Character label mapping
        num_train_docs: Number of training documents
        num_val_docs: Number of validation documents
        doc_width: Document width
        doc_height: Document height
        chars_per_doc: Characters per document
    """
    # Create directories
    for split in ['train', 'val']:
        (output_dir / 'images' / split).mkdir(parents=True, exist_ok=True)
        (output_dir / 'labels' / split).mkdir(parents=True, exist_ok=True)
    
    # OCR labels directory
    (output_dir / 'ocr_labels').mkdir(parents=True, exist_ok=True)
    
    # Convert datasets to lists for random sampling
    print("Preparing character samples...")
    train_chars = []
    for img, label in tqdm(train_dataset, desc="Loading train"):
        char = char_mapping.get(label, '?')
        train_chars.append((tensor_to_image(img), char))
    
    test_chars = []
    for img, label in tqdm(test_dataset, desc="Loading test"):
        char = char_mapping.get(label, '?')
        test_chars.append((tensor_to_image(img), char))
    
    all_ocr_labels = []
    
    # Generate training documents
    print(f"\nGenerating {num_train_docs} training documents...")
    for doc_idx in tqdm(range(num_train_docs), desc="Train docs"):
        # Random sample of characters
        chars = random.sample(train_chars, min(chars_per_doc, len(train_chars)))
        
        # Create document
        doc_img, char_boxes = create_document_image(
            chars, doc_width, doc_height,
            chars_per_line=random.randint(6, 10),
            num_lines=random.randint(2, 4),
        )
        
        # Merge into word boxes
        word_boxes = create_word_boxes(char_boxes)
        
        if not word_boxes:
            continue
        
        # Save image
        img_name = f"doc_train_{doc_idx:05d}.jpg"
        img_path = output_dir / 'images' / 'train' / img_name
        cv2.imwrite(str(img_path), doc_img)
        
        # Save YOLO labels
        label_path = output_dir / 'labels' / 'train' / f"doc_train_{doc_idx:05d}.txt"
        with open(label_path, 'w') as f:
            for box, text in word_boxes:
                yolo_line = box_to_yolo(box, doc_width, doc_height)
                f.write(yolo_line + '\n')
                all_ocr_labels.append({'box': box, 'text': text, 'image': img_name})
    
    # Generate validation documents
    print(f"\nGenerating {num_val_docs} validation documents...")
    for doc_idx in tqdm(range(num_val_docs), desc="Val docs"):
        chars = random.sample(test_chars, min(chars_per_doc, len(test_chars)))
        
        doc_img, char_boxes = create_document_image(
            chars, doc_width, doc_height,
            chars_per_line=random.randint(6, 10),
            num_lines=random.randint(2, 4),
        )
        
        word_boxes = create_word_boxes(char_boxes)
        
        if not word_boxes:
            continue
        
        img_name = f"doc_val_{doc_idx:05d}.jpg"
        img_path = output_dir / 'images' / 'val' / img_name
        cv2.imwrite(str(img_path), doc_img)
        
        label_path = output_dir / 'labels' / 'val' / f"doc_val_{doc_idx:05d}.txt"
        with open(label_path, 'w') as f:
            for box, text in word_boxes:
                yolo_line = box_to_yolo(box, doc_width, doc_height)
                f.write(yolo_line + '\n')
                all_ocr_labels.append({'box': box, 'text': text, 'image': img_name})
    
    # Save OCR labels
    import json
    ocr_labels_path = output_dir / 'ocr_labels' / 'labels.json'
    with open(ocr_labels_path, 'w') as f:
        json.dump(all_ocr_labels, f, indent=2)
    
    print(f"✅ Saved OCR labels to {ocr_labels_path}")


def create_data_yaml(output_dir: Path):
    """Create YOLO data.yaml configuration file."""
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
    
    print(f"✅ Created {yaml_path}")
    return yaml_path


def validate_dataset(output_dir: Path) -> bool:
    """Validate the created dataset."""
    print("\n" + "="*50)
    print("Validating Dataset")
    print("="*50)
    
    for split in ['train', 'val']:
        images_dir = output_dir / 'images' / split
        labels_dir = output_dir / 'labels' / split
        
        images = list(images_dir.glob('*.jpg'))
        labels = list(labels_dir.glob('*.txt'))
        
        print(f"\n{split}:")
        print(f"  Images: {len(images)}")
        print(f"  Labels: {len(labels)}")
        
        # Check a sample
        if labels:
            sample_label = labels[0]
            with open(sample_label, 'r') as f:
                lines = f.readlines()
                print(f"  Sample boxes per image: {len(lines)}")
    
    print("\n✅ Dataset validation complete!")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Convert EMNIST to YOLO format for handwriting detection'
    )
    parser.add_argument('--output', '-o', type=str, default='./data/yolo_format',
                       help='Output directory for YOLO format dataset')
    parser.add_argument('--data-dir', '-d', type=str, default='./data/emnist',
                       help='Directory to download/store EMNIST')
    parser.add_argument('--split', '-s', type=str, default='byclass',
                       choices=['byclass', 'letters', 'digits', 'balanced', 'mnist'],
                       help='EMNIST split to use')
    parser.add_argument('--num-train', type=int, default=1000,
                       help='Number of training document images')
    parser.add_argument('--num-val', type=int, default=200,
                       help='Number of validation document images')
    parser.add_argument('--doc-width', type=int, default=640,
                       help='Document width')
    parser.add_argument('--doc-height', type=int, default=480,
                       help='Document height')
    parser.add_argument('--chars-per-doc', type=int, default=30,
                       help='Characters per document')
    parser.add_argument('--quick', '-q', action='store_true',
                       help='Quick mode: 100 train, 20 val docs')
    
    args = parser.parse_args()
    
    output_dir = Path(args.output)
    data_dir = Path(args.data_dir)
    
    # Quick mode
    if args.quick:
        args.num_train = 100
        args.num_val = 20
        print("🚀 Quick mode: 100 train, 20 val documents")
    
    print("="*60)
    print(" EMNIST to YOLO Converter")
    print("="*60)
    print(f"Split: {args.split}")
    print(f"Output: {output_dir}")
    print(f"Train docs: {args.num_train}")
    print(f"Val docs: {args.num_val}")
    
    # Download EMNIST
    train_dataset, test_dataset = download_emnist(data_dir, args.split)
    
    # Get character mapping
    char_mapping = get_char_mapping(args.split)
    print(f"Character classes: {len(char_mapping)}")
    
    # Create YOLO dataset
    create_yolo_dataset(
        train_dataset=train_dataset,
        test_dataset=test_dataset,
        output_dir=output_dir,
        char_mapping=char_mapping,
        num_train_docs=args.num_train,
        num_val_docs=args.num_val,
        doc_width=args.doc_width,
        doc_height=args.doc_height,
        chars_per_doc=args.chars_per_doc,
    )
    
    # Create data.yaml
    create_data_yaml(output_dir)
    
    # Validate
    validate_dataset(output_dir)
    
    print("\n" + "="*60)
    print(" Dataset Creation Complete!")
    print("="*60)
    print(f"\nNext steps:")
    print(f"1. Validate: python scripts/validate_dataset.py --data {output_dir} --visualize")
    print(f"2. Train: python scripts/train_detector.py --data {output_dir}/data.yaml")


if __name__ == "__main__":
    main()
