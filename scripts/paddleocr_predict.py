"""
PaddleOCR Prediction Script
Uses pre-trained PaddleOCR model (trained on real handwriting)
NO TRAINING NEEDED - works out of the box!

PaddleOCR advantages:
- Pre-trained on millions of real handwriting samples
- Handles cursive and block text
- Very fast (similar to our optimized pipeline)
- Completely free and open source
- Works on English, Chinese, and 80+ languages
"""

import argparse
from pathlib import Path
import time
import json
import cv2
import numpy as np


def predict_with_paddleocr(image_path: str, visualize: bool = False, print_text: bool = False):
    """Run PaddleOCR on image."""
    from paddleocr import PaddleOCR
    
    print(f"Initializing PaddleOCR...")
    print(f"  Using pre-trained models (no training needed!)")
    
    # Initialize PaddleOCR
    ocr = PaddleOCR(lang='en')
    
    print(f"✅ PaddleOCR ready!\n")
    
    # Read image
    img = cv2.imread(str(image_path))
    if img is None:
        print(f"❌ Could not load image: {image_path}")
        return None
    
    print(f"Processing: {image_path}")
    start_time = time.time()
    
    # Run OCR
    result = ocr.predict(str(image_path))
    
    processing_time = (time.time() - start_time) * 1000
    
    # Parse results
    detections = []
    all_text = []
    
    if isinstance(result, list) and len(result) > 0:
        # PaddleOCR returns list of detection dictionaries
        for idx, line in enumerate(result):
            if isinstance(line, dict):
                text = line.get('rec_text', line.get('text', ''))
                conf = line.get('rec_score', line.get('score', 0.9))
                
                # Get box coordinates
                if 'dt_polys' in line:
                    box_coords = line['dt_polys'][0] if isinstance(line['dt_polys'], list) else line['dt_polys']
                elif 'box' in line:
                    box_coords = line['box']
                elif 'bbox' in line:
                    box_coords = line['bbox']
                else:
                    continue
                
                # Convert box to [x1, y1, x2, y2]
                if isinstance(box_coords[0], (list, tuple)):
                    # Format: [[x1,y1], [x2,y2], ...]
                    x_coords = [p[0] for p in box_coords]
                    y_coords = [p[1] for p in box_coords]
                    x1, y1 = min(x_coords), min(y_coords)
                    x2, y2 = max(x_coords), max(y_coords)
                else:
                    # Format: [x1, y1, x2, y2]
                    x1, y1, x2, y2 = box_coords[:4]
                
                if text:
                    detections.append({
                        'id': len(detections),
                        'box': [int(x1), int(y1), int(x2), int(y2)],
                        'text': text,
                        'confidence': round(float(conf), 4)
                    })
                    
                    all_text.append(text)
    
    # Print results
    if print_text:
        print("\n" + "="*60)
        print(" RECOGNIZED TEXT")
        print("="*60)
        print("\n".join(all_text))
        print("="*60)
    
    print(f"\nDetections: {len(detections)}")
    print(f"Processing time: {processing_time:.1f}ms")
    
    # Visualize
    if visualize and detections:
        vis_img = img.copy()
        
        for det in detections:
            x1, y1, x2, y2 = det['box']
            
            # Draw box
            cv2.rectangle(vis_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw text
            text = det['text']
            conf = det['confidence']
            label = f"{text} ({conf:.2f})"
            
            # Background for text
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(vis_img, (x1, y1 - label_h - 10), (x1 + label_w, y1), (0, 255, 0), -1)
            cv2.putText(vis_img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        
        # Save visualization
        output_path = Path(image_path).parent / f"{Path(image_path).stem}_paddleocr.jpg"
        cv2.imwrite(str(output_path), vis_img)
        print(f"✅ Visualization saved to: {output_path}")
    
    # Create result dict
    result_dict = {
        'image_path': str(image_path),
        'num_detections': len(detections),
        'detections': detections,
        'aggregated_text': '\n'.join(all_text),
        'processing_time_ms': round(processing_time, 2),
    }
    
    return result_dict


def main():
    parser = argparse.ArgumentParser(
        description='PaddleOCR prediction (pre-trained on real handwriting)',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument('--image', '-i', type=str, required=True,
                       help='Path to input image')
    parser.add_argument('--visualize', '-v', action='store_true',
                       help='Save visualization with boxes and text')
    parser.add_argument('--print-text', '-p', action='store_true',
                       help='Print recognized text to console')
    parser.add_argument('--output', '-o', type=str, default=None,
                       help='Save JSON result to file')
    
    args = parser.parse_args()
    
    # Run prediction
    result = predict_with_paddleocr(
        args.image,
        visualize=args.visualize,
        print_text=args.print_text
    )
    
    # Save JSON if requested
    if args.output and result:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\n✅ Result saved to: {output_path}")


if __name__ == "__main__":
    main()
