"""
Dataset Validation and Visualization
Validates YOLO format dataset and displays sample images with bounding boxes
"""

import os
import sys
import argparse
import random
from pathlib import Path
from typing import List, Tuple, Optional

import cv2
import numpy as np
import matplotlib.pyplot as plt
from tqdm import tqdm
import yaml


def load_yolo_labels(label_path: Path) -> List[Tuple[int, float, float, float, float]]:
    """Load YOLO format labels from file."""
    labels = []
    if not label_path.exists():
        return labels
    
    with open(label_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 5:
                try:
                    cls = int(parts[0])
                    x_center, y_center, width, height = map(float, parts[1:])
                    labels.append((cls, x_center, y_center, width, height))
                except ValueError:
                    continue
    return labels


def yolo_to_bbox(yolo_box: Tuple[int, float, float, float, float], 
                  img_width: int, img_height: int) -> Tuple[int, int, int, int]:
    """Convert YOLO format to pixel coordinates (x1, y1, x2, y2)."""
    cls, x_center, y_center, w, h = yolo_box
    
    x1 = int((x_center - w/2) * img_width)
    y1 = int((y_center - h/2) * img_height)
    x2 = int((x_center + w/2) * img_width)
    y2 = int((y_center + h/2) * img_height)
    
    return x1, y1, x2, y2


def draw_boxes(image: np.ndarray, labels: List[Tuple], 
               class_names: dict = None) -> np.ndarray:
    """Draw bounding boxes on image."""
    img = image.copy()
    h, w = img.shape[:2]
    
    colors = [(0, 255, 0), (255, 0, 0), (0, 0, 255), (255, 255, 0)]
    
    for label in labels:
        cls, x_center, y_center, bw, bh = label
        x1, y1, x2, y2 = yolo_to_bbox(label, w, h)
        
        color = colors[cls % len(colors)]
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        
        class_name = class_names.get(cls, f"class_{cls}") if class_names else f"class_{cls}"
        label_text = f"{class_name}"
        
        (text_w, text_h), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(img, (x1, y1 - text_h - 4), (x1 + text_w, y1), color, -1)
        cv2.putText(img, label_text, (x1, y1 - 2), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    return img


def validate_dataset(data_dir: Path, verbose: bool = True) -> dict:
    """Validate YOLO format dataset and return statistics."""
    stats = {
        'train': {'images': 0, 'labels': 0, 'boxes': 0, 'errors': []},
        'val': {'images': 0, 'labels': 0, 'boxes': 0, 'errors': []},
        'test': {'images': 0, 'labels': 0, 'boxes': 0, 'errors': []},
    }
    
    for split in ['train', 'val', 'test']:
        images_dir = data_dir / 'images' / split
        labels_dir = data_dir / 'labels' / split
        
        if not images_dir.exists():
            if verbose:
                print(f"⚠️  {split}: images directory not found")
            continue
        
        image_files = list(images_dir.glob('*.jpg')) + \
                     list(images_dir.glob('*.png')) + \
                     list(images_dir.glob('*.jpeg'))
        
        stats[split]['images'] = len(image_files)
        
        for img_path in tqdm(image_files, desc=f"Validating {split}", disable=not verbose):
            label_path = labels_dir / f"{img_path.stem}.txt"
            
            if label_path.exists():
                stats[split]['labels'] += 1
                labels = load_yolo_labels(label_path)
                stats[split]['boxes'] += len(labels)
                
                # Validate label values
                for label in labels:
                    cls, x, y, w, h = label
                    if not (0 <= x <= 1 and 0 <= y <= 1 and 0 <= w <= 1 and 0 <= h <= 1):
                        stats[split]['errors'].append(f"{img_path.stem}: Invalid coordinates")
                    if w <= 0 or h <= 0:
                        stats[split]['errors'].append(f"{img_path.stem}: Zero-size box")
            else:
                stats[split]['errors'].append(f"{img_path.stem}: Missing label file")
        
        if verbose:
            print(f"\n{split.upper()}:")
            print(f"  Images: {stats[split]['images']}")
            print(f"  Labels: {stats[split]['labels']}")
            print(f"  Total boxes: {stats[split]['boxes']}")
            if stats[split]['images'] > 0:
                print(f"  Avg boxes/image: {stats[split]['boxes'] / stats[split]['images']:.2f}")
            if stats[split]['errors']:
                print(f"  ⚠️  Errors: {len(stats[split]['errors'])}")
    
    return stats


def visualize_samples(data_dir: Path, num_samples: int = 9, 
                     split: str = 'train', save_path: Optional[Path] = None):
    """Visualize random samples with bounding boxes."""
    images_dir = data_dir / 'images' / split
    labels_dir = data_dir / 'labels' / split
    
    # Load data.yaml for class names
    data_yaml = data_dir / 'data.yaml'
    class_names = {0: 'handwriting'}
    if data_yaml.exists():
        with open(data_yaml, 'r') as f:
            config = yaml.safe_load(f)
            if 'names' in config:
                class_names = config['names']
    
    # Get image files
    image_files = list(images_dir.glob('*.jpg')) + \
                 list(images_dir.glob('*.png')) + \
                 list(images_dir.glob('*.jpeg'))
    
    if not image_files:
        print(f"No images found in {images_dir}")
        return
    
    # Random sample
    samples = random.sample(image_files, min(num_samples, len(image_files)))
    
    # Create grid
    cols = min(3, len(samples))
    rows = (len(samples) + cols - 1) // cols
    
    fig, axes = plt.subplots(rows, cols, figsize=(5*cols, 5*rows))
    if rows == 1 and cols == 1:
        axes = [[axes]]
    elif rows == 1:
        axes = [axes]
    elif cols == 1:
        axes = [[ax] for ax in axes]
    
    for idx, img_path in enumerate(samples):
        row, col = idx // cols, idx % cols
        ax = axes[row][col]
        
        # Load image
        img = cv2.imread(str(img_path))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Load and draw labels
        label_path = labels_dir / f"{img_path.stem}.txt"
        labels = load_yolo_labels(label_path)
        
        img_with_boxes = draw_boxes(img, labels, class_names)
        
        ax.imshow(img_with_boxes)
        ax.set_title(f"{img_path.stem}\n{len(labels)} boxes", fontsize=8)
        ax.axis('off')
    
    # Hide empty axes
    for idx in range(len(samples), rows * cols):
        row, col = idx // cols, idx % cols
        axes[row][col].axis('off')
    
    plt.suptitle(f"Dataset Samples ({split})", fontsize=14)
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Saved visualization to {save_path}")
    
    plt.show()


def check_class_distribution(data_dir: Path) -> dict:
    """Check class distribution in dataset."""
    distribution = {}
    
    for split in ['train', 'val']:
        labels_dir = data_dir / 'labels' / split
        if not labels_dir.exists():
            continue
        
        split_dist = {}
        for label_file in labels_dir.glob('*.txt'):
            labels = load_yolo_labels(label_file)
            for label in labels:
                cls = label[0]
                split_dist[cls] = split_dist.get(cls, 0) + 1
        
        distribution[split] = split_dist
    
    return distribution


def check_box_sizes(data_dir: Path, split: str = 'train') -> dict:
    """Analyze bounding box size distribution."""
    widths = []
    heights = []
    areas = []
    aspect_ratios = []
    
    labels_dir = data_dir / 'labels' / split
    if not labels_dir.exists():
        return {}
    
    for label_file in labels_dir.glob('*.txt'):
        labels = load_yolo_labels(label_file)
        for label in labels:
            _, _, _, w, h = label
            widths.append(w)
            heights.append(h)
            areas.append(w * h)
            if h > 0:
                aspect_ratios.append(w / h)
    
    if not widths:
        return {}
    
    return {
        'width': {'min': min(widths), 'max': max(widths), 'mean': np.mean(widths)},
        'height': {'min': min(heights), 'max': max(heights), 'mean': np.mean(heights)},
        'area': {'min': min(areas), 'max': max(areas), 'mean': np.mean(areas)},
        'aspect_ratio': {'min': min(aspect_ratios), 'max': max(aspect_ratios), 
                        'mean': np.mean(aspect_ratios)},
    }


def main():
    parser = argparse.ArgumentParser(description='Validate YOLO format dataset')
    parser.add_argument('--data', '-d', type=str, default='./data/yolo_format',
                       help='Path to YOLO format dataset')
    parser.add_argument('--visualize', '-v', action='store_true',
                       help='Visualize sample images with boxes')
    parser.add_argument('--num-samples', '-n', type=int, default=9,
                       help='Number of samples to visualize')
    parser.add_argument('--split', '-s', type=str, default='train',
                       choices=['train', 'val', 'test'],
                       help='Split to visualize')
    parser.add_argument('--save', type=str, default=None,
                       help='Save visualization to file')
    parser.add_argument('--check-sizes', action='store_true',
                       help='Analyze bounding box size distribution')
    
    args = parser.parse_args()
    data_dir = Path(args.data)
    
    if not data_dir.exists():
        print(f"❌ Dataset not found: {data_dir}")
        sys.exit(1)
    
    print("="*60)
    print(" YOLO Dataset Validation")
    print("="*60)
    print(f"Dataset path: {data_dir}")
    
    # Validate dataset
    stats = validate_dataset(data_dir)
    
    # Check class distribution
    print("\n" + "="*60)
    print(" Class Distribution")
    print("="*60)
    distribution = check_class_distribution(data_dir)
    for split, dist in distribution.items():
        print(f"\n{split}:")
        for cls, count in sorted(dist.items()):
            print(f"  Class {cls}: {count} boxes")
    
    # Check box sizes
    if args.check_sizes:
        print("\n" + "="*60)
        print(" Bounding Box Statistics")
        print("="*60)
        size_stats = check_box_sizes(data_dir, args.split)
        for metric, values in size_stats.items():
            print(f"\n{metric}:")
            for stat, val in values.items():
                print(f"  {stat}: {val:.4f}")
    
    # Overall status
    print("\n" + "="*60)
    print(" Summary")
    print("="*60)
    
    total_images = sum(s['images'] for s in stats.values())
    total_boxes = sum(s['boxes'] for s in stats.values())
    total_errors = sum(len(s['errors']) for s in stats.values())
    
    print(f"Total images: {total_images}")
    print(f"Total boxes: {total_boxes}")
    print(f"Total errors: {total_errors}")
    
    if total_errors == 0 and total_images > 0:
        print("\n✅ Dataset validation PASSED!")
    elif total_errors > 0:
        print(f"\n⚠️  Dataset has {total_errors} issues")
    else:
        print("\n❌ No valid data found")
    
    # Visualize
    if args.visualize:
        print("\n" + "="*60)
        print(" Visualization")
        print("="*60)
        save_path = Path(args.save) if args.save else None
        visualize_samples(data_dir, args.num_samples, args.split, save_path)


if __name__ == "__main__":
    main()
