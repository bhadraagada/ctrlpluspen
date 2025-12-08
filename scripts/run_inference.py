"""
Inference Script for Handwriting Detection
Runs YOLOv8 model on images and saves detection results
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple

import cv2
import numpy as np
import torch
from ultralytics import YOLO
from tqdm import tqdm


def load_model(model_path: str, device: str = '0') -> YOLO:
    """Load YOLOv8 model."""
    print(f"Loading model: {model_path}")
    model = YOLO(model_path)
    return model


def run_detection(
    model: YOLO,
    image_path: Path,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.45,
    imgsz: int = 640,
    device: str = '0',
) -> Tuple[List[Dict], np.ndarray]:
    """
    Run detection on a single image.
    
    Returns:
        detections: List of detection dictionaries
        image: Original image array
    """
    # Load image
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    h, w = image.shape[:2]
    
    # Run inference
    results = model.predict(
        source=image,
        conf=conf_threshold,
        iou=iou_threshold,
        imgsz=imgsz,
        device=device,
        verbose=False,
    )[0]
    
    # Parse results
    detections = []
    boxes = results.boxes
    
    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
        conf = float(box.conf[0].cpu().numpy())
        cls = int(box.cls[0].cpu().numpy())
        
        detection = {
            'id': i,
            'box': [int(x1), int(y1), int(x2), int(y2)],
            'confidence': round(conf, 4),
            'class': cls,
            'class_name': model.names[cls],
            'center': [int((x1 + x2) / 2), int((y1 + y2) / 2)],
            'width': int(x2 - x1),
            'height': int(y2 - y1),
        }
        detections.append(detection)
    
    return detections, image


def crop_detections(
    image: np.ndarray,
    detections: List[Dict],
    padding: int = 5,
    min_size: int = 10,
) -> List[Tuple[np.ndarray, Dict]]:
    """
    Crop detected regions from image.
    
    Args:
        image: Original image
        detections: List of detection dictionaries
        padding: Padding around crops (pixels)
        min_size: Minimum crop size
        
    Returns:
        List of (crop_image, detection) tuples
    """
    h, w = image.shape[:2]
    crops = []
    
    for det in detections:
        x1, y1, x2, y2 = det['box']
        
        # Add padding
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)
        
        # Check minimum size
        if (x2 - x1) < min_size or (y2 - y1) < min_size:
            continue
        
        crop = image[y1:y2, x1:x2].copy()
        crops.append((crop, det))
    
    return crops


def save_crops(
    crops: List[Tuple[np.ndarray, Dict]],
    output_dir: Path,
    image_name: str,
) -> List[str]:
    """Save cropped regions to files."""
    output_dir.mkdir(parents=True, exist_ok=True)
    saved_paths = []
    
    for i, (crop, det) in enumerate(crops):
        crop_filename = f"{image_name}_crop_{i:03d}.jpg"
        crop_path = output_dir / crop_filename
        cv2.imwrite(str(crop_path), crop)
        saved_paths.append(str(crop_path))
        det['crop_path'] = str(crop_path)
    
    return saved_paths


def save_results_json(
    results: Dict,
    output_path: Path,
):
    """Save detection results to JSON file."""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)


def draw_detections(
    image: np.ndarray,
    detections: List[Dict],
    show_conf: bool = True,
    show_id: bool = True,
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2,
) -> np.ndarray:
    """Draw detection boxes on image."""
    img = image.copy()
    
    for det in detections:
        x1, y1, x2, y2 = det['box']
        conf = det['confidence']
        det_id = det['id']
        
        # Draw box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)
        
        # Draw label
        label_parts = []
        if show_id:
            label_parts.append(f"#{det_id}")
        if show_conf:
            label_parts.append(f"{conf:.2f}")
        
        if label_parts:
            label = " ".join(label_parts)
            (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(img, (x1, y1 - text_h - 4), (x1 + text_w + 4, y1), color, -1)
            cv2.putText(img, label, (x1 + 2, y1 - 2), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    return img


def process_directory(
    model: YOLO,
    source_dir: Path,
    output_dir: Path,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.45,
    imgsz: int = 640,
    device: str = '0',
    save_crops: bool = True,
    save_visualizations: bool = True,
) -> Dict:
    """Process all images in a directory."""
    
    # Find images
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
    image_files = [
        f for f in source_dir.iterdir()
        if f.suffix.lower() in image_extensions
    ]
    
    if not image_files:
        print(f"No images found in {source_dir}")
        return {}
    
    print(f"Found {len(image_files)} images")
    
    # Create output directories
    crops_dir = output_dir / 'crops'
    vis_dir = output_dir / 'visualizations'
    json_dir = output_dir / 'detections'
    
    crops_dir.mkdir(parents=True, exist_ok=True)
    vis_dir.mkdir(parents=True, exist_ok=True)
    json_dir.mkdir(parents=True, exist_ok=True)
    
    all_results = {
        'model': str(model.model_name),
        'timestamp': datetime.now().isoformat(),
        'config': {
            'conf_threshold': conf_threshold,
            'iou_threshold': iou_threshold,
            'imgsz': imgsz,
        },
        'images': [],
    }
    
    total_detections = 0
    
    for img_path in tqdm(image_files, desc="Processing images"):
        try:
            # Run detection
            detections, image = run_detection(
                model, img_path, conf_threshold, iou_threshold, imgsz, device
            )
            
            h, w = image.shape[:2]
            
            # Save crops
            crop_paths = []
            if save_crops and detections:
                crops = crop_detections(image, detections)
                crop_paths = save_crops(crops, crops_dir, img_path.stem)
            
            # Save visualization
            vis_path = None
            if save_visualizations and detections:
                vis_image = draw_detections(image, detections)
                vis_path = vis_dir / f"{img_path.stem}_detected.jpg"
                cv2.imwrite(str(vis_path), vis_image)
            
            # Create result entry
            result = {
                'image_path': str(img_path),
                'image_size': {'width': w, 'height': h},
                'num_detections': len(detections),
                'detections': detections,
            }
            
            if vis_path:
                result['visualization_path'] = str(vis_path)
            
            all_results['images'].append(result)
            total_detections += len(detections)
            
            # Save individual JSON
            json_path = json_dir / f"{img_path.stem}.json"
            save_results_json(result, json_path)
            
        except Exception as e:
            print(f"Error processing {img_path}: {e}")
            continue
    
    # Save combined results
    all_results['summary'] = {
        'total_images': len(image_files),
        'processed_images': len(all_results['images']),
        'total_detections': total_detections,
        'avg_detections_per_image': total_detections / len(all_results['images']) if all_results['images'] else 0,
    }
    
    combined_json_path = output_dir / 'all_detections.json'
    save_results_json(all_results, combined_json_path)
    
    print(f"\n✅ Processing complete!")
    print(f"   Total images: {len(image_files)}")
    print(f"   Total detections: {total_detections}")
    print(f"   Results saved to: {output_dir}")
    
    return all_results


def main():
    parser = argparse.ArgumentParser(
        description='Run handwriting detection inference',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Required arguments
    parser.add_argument('--model', '-m', type=str, required=True,
                       help='Path to trained YOLO model (best.pt)')
    parser.add_argument('--source', '-s', type=str, required=True,
                       help='Path to image file or directory')
    
    # Detection parameters
    parser.add_argument('--conf', type=float, default=0.25,
                       help='Confidence threshold')
    parser.add_argument('--iou', type=float, default=0.45,
                       help='IoU threshold for NMS')
    parser.add_argument('--imgsz', type=int, default=640,
                       help='Image size')
    parser.add_argument('--device', type=str, default='0',
                       help='Device (0 for GPU, cpu for CPU)')
    
    # Output options
    parser.add_argument('--output', '-o', type=str, default='./outputs',
                       help='Output directory')
    parser.add_argument('--save-crops', action='store_true', default=True,
                       help='Save cropped detection regions')
    parser.add_argument('--no-crops', action='store_true',
                       help='Do not save crops')
    parser.add_argument('--save-vis', action='store_true', default=True,
                       help='Save visualization images')
    parser.add_argument('--no-vis', action='store_true',
                       help='Do not save visualizations')
    
    args = parser.parse_args()
    
    # Check model exists
    model_path = Path(args.model)
    if not model_path.exists():
        print(f"❌ Model not found: {model_path}")
        sys.exit(1)
    
    # Check source exists
    source_path = Path(args.source)
    if not source_path.exists():
        print(f"❌ Source not found: {source_path}")
        sys.exit(1)
    
    # Load model
    model = load_model(str(model_path), args.device)
    
    output_dir = Path(args.output)
    save_crops_flag = args.save_crops and not args.no_crops
    save_vis_flag = args.save_vis and not args.no_vis
    
    if source_path.is_file():
        # Single image
        print(f"Processing single image: {source_path}")
        
        detections, image = run_detection(
            model, source_path, args.conf, args.iou, args.imgsz, args.device
        )
        
        print(f"Found {len(detections)} detections")
        
        # Save crops
        if save_crops_flag and detections:
            crops_dir = output_dir / 'crops'
            crops = crop_detections(image, detections)
            save_crops(crops, crops_dir, source_path.stem)
        
        # Save visualization
        if save_vis_flag:
            vis_image = draw_detections(image, detections)
            vis_dir = output_dir / 'visualizations'
            vis_dir.mkdir(parents=True, exist_ok=True)
            vis_path = vis_dir / f"{source_path.stem}_detected.jpg"
            cv2.imwrite(str(vis_path), vis_image)
            print(f"Visualization saved to: {vis_path}")
        
        # Save JSON
        result = {
            'image_path': str(source_path),
            'image_size': {'width': image.shape[1], 'height': image.shape[0]},
            'num_detections': len(detections),
            'detections': detections,
        }
        
        json_dir = output_dir / 'detections'
        json_dir.mkdir(parents=True, exist_ok=True)
        json_path = json_dir / f"{source_path.stem}.json"
        save_results_json(result, json_path)
        print(f"Results saved to: {json_path}")
        
        # Print detections
        for det in detections:
            print(f"  #{det['id']}: box={det['box']}, conf={det['confidence']:.3f}")
        
    else:
        # Directory
        process_directory(
            model=model,
            source_dir=source_path,
            output_dir=output_dir,
            conf_threshold=args.conf,
            iou_threshold=args.iou,
            imgsz=args.imgsz,
            device=args.device,
            save_crops=save_crops_flag,
            save_visualizations=save_vis_flag,
        )


if __name__ == "__main__":
    main()
