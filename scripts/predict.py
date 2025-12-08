"""
Full Pipeline Prediction Script
End-to-end handwriting detection and OCR
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
from PIL import Image


def check_dependencies():
    """Check and import required dependencies."""
    dependencies = {
        'ultralytics': False,
        'transformers': False,
        'easyocr': False,
    }
    
    try:
        from ultralytics import YOLO
        dependencies['ultralytics'] = True
    except ImportError:
        pass
    
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        dependencies['transformers'] = True
    except ImportError:
        pass
    
    try:
        import easyocr
        dependencies['easyocr'] = True
    except ImportError:
        pass
    
    return dependencies


class HandwritingOCR:
    """
    Complete handwriting detection and OCR pipeline.
    
    Usage:
        pipeline = HandwritingOCR(
            detector_path='models/detector/best.pt',
            ocr_model='microsoft/trocr-large-handwritten'
        )
        result = pipeline.predict('image.jpg')
        print(result['aggregated_text'])
    """
    
    def __init__(
        self,
        detector_path: str = None,
        ocr_model: str = "microsoft/trocr-large-handwritten",
        ocr_engine: str = "trocr",  # 'trocr' or 'easyocr'
        device: str = None,
        use_fp16: bool = True,
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45,
        imgsz: int = 640,
    ):
        """
        Initialize the pipeline.
        
        Args:
            detector_path: Path to YOLO detector model
            ocr_model: TrOCR model name or path
            ocr_engine: OCR engine ('trocr' or 'easyocr')
            device: Device to use ('cuda' or 'cpu')
            use_fp16: Use FP16 for inference
            conf_threshold: Detection confidence threshold
            iou_threshold: NMS IoU threshold
            imgsz: Detection image size
        """
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.use_fp16 = use_fp16 and self.device == 'cuda'
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.imgsz = imgsz
        self.ocr_engine_type = ocr_engine
        
        print(f"Initializing HandwritingOCR pipeline...")
        print(f"  Device: {self.device}")
        print(f"  FP16: {self.use_fp16}")
        
        # Load detector
        self.detector = None
        if detector_path:
            self._load_detector(detector_path)
        
        # Load OCR
        self.ocr_engine = None
        self._load_ocr(ocr_model, ocr_engine)
        
        print("✅ Pipeline ready!")
    
    def _load_detector(self, model_path: str):
        """Load YOLO detector."""
        from ultralytics import YOLO
        
        print(f"  Loading detector: {model_path}")
        self.detector = YOLO(model_path)
    
    def _load_ocr(self, model_name: str, engine: str):
        """Load OCR engine."""
        if engine == 'trocr':
            from transformers import TrOCRProcessor, VisionEncoderDecoderModel
            
            print(f"  Loading TrOCR: {model_name}")
            self.ocr_processor = TrOCRProcessor.from_pretrained(model_name)
            self.ocr_model = VisionEncoderDecoderModel.from_pretrained(model_name)
            self.ocr_model.to(self.device)
            
            if self.use_fp16:
                self.ocr_model = self.ocr_model.half()
            
            self.ocr_model.eval()
            self.ocr_engine = 'trocr'
            
        elif engine == 'easyocr':
            import easyocr
            
            print(f"  Loading EasyOCR...")
            self.ocr_reader = easyocr.Reader(
                ['en'], 
                gpu=self.device == 'cuda'
            )
            self.ocr_engine = 'easyocr'
    
    def detect(self, image: np.ndarray) -> List[Dict]:
        """
        Run detection on image.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            List of detection dictionaries
        """
        if self.detector is None:
            # No detector - return full image as single detection
            h, w = image.shape[:2]
            return [{
                'id': 0,
                'box': [0, 0, w, h],
                'confidence': 1.0,
            }]
        
        results = self.detector.predict(
            source=image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            imgsz=self.imgsz,
            device=self.device,
            verbose=False,
        )[0]
        
        detections = []
        for i, box in enumerate(results.boxes):
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            
            detections.append({
                'id': i,
                'box': [int(x1), int(y1), int(x2), int(y2)],
                'confidence': round(conf, 4),
            })
        
        return detections
    
    def crop_region(
        self, 
        image: np.ndarray, 
        box: List[int], 
        padding: int = 5
    ) -> np.ndarray:
        """Crop a region from image with optional padding."""
        h, w = image.shape[:2]
        x1, y1, x2, y2 = box
        
        # Add padding
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(w, x2 + padding)
        y2 = min(h, y2 + padding)
        
        return image[y1:y2, x1:x2].copy()
    
    def recognize_text(self, crop: np.ndarray) -> Tuple[str, float]:
        """
        Recognize text in cropped image.
        
        Args:
            crop: Cropped image region
            
        Returns:
            (text, confidence) tuple
        """
        if self.ocr_engine == 'trocr':
            return self._recognize_trocr(crop)
        elif self.ocr_engine == 'easyocr':
            return self._recognize_easyocr(crop)
        else:
            return "", 0.0
    
    def _recognize_trocr(self, crop: np.ndarray) -> Tuple[str, float]:
        """Recognize text using TrOCR."""
        # Convert BGR to RGB
        if len(crop.shape) == 3:
            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        else:
            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_GRAY2RGB)
        
        pil_image = Image.fromarray(crop_rgb)
        
        pixel_values = self.ocr_processor(
            pil_image, return_tensors="pt"
        ).pixel_values.to(self.device)
        
        if self.use_fp16:
            pixel_values = pixel_values.half()
        
        with torch.no_grad():
            generated_ids = self.ocr_model.generate(
                pixel_values,
                max_length=64,  # Reduced from 128 for speed
                num_beams=1,    # Greedy decoding instead of beam search (4x faster)
                early_stopping=True,
            )
        
        text = self.ocr_processor.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0]
        
        return text.strip(), 0.9  # Placeholder confidence
    
    def _recognize_trocr_batch(self, crops: List[np.ndarray]) -> List[Tuple[str, float]]:
        """Recognize text using TrOCR with batch processing (much faster)."""
        if not crops:
            return []
        
        # Convert all crops to RGB PIL images
        pil_images = []
        for crop in crops:
            if len(crop.shape) == 3:
                crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            else:
                crop_rgb = cv2.cvtColor(crop, cv2.COLOR_GRAY2RGB)
            pil_images.append(Image.fromarray(crop_rgb))
        
        # Process in batches
        batch_size = 8  # Process 8 images at once
        all_texts = []
        
        for i in range(0, len(pil_images), batch_size):
            batch = pil_images[i:i+batch_size]
            
            pixel_values = self.ocr_processor(
                batch, return_tensors="pt", padding=True
            ).pixel_values.to(self.device)
            
            if self.use_fp16:
                pixel_values = pixel_values.half()
            
            with torch.no_grad():
                generated_ids = self.ocr_model.generate(
                    pixel_values,
                    max_length=64,
                    num_beams=1,  # Greedy decoding for speed
                    early_stopping=True,
                )
            
            texts = self.ocr_processor.batch_decode(
                generated_ids, skip_special_tokens=True
            )
            all_texts.extend(texts)
        
        return [(text.strip(), 0.9) for text in all_texts]
    
    def _recognize_easyocr(self, crop: np.ndarray) -> Tuple[str, float]:
        """Recognize text using EasyOCR."""
        results = self.ocr_reader.readtext(crop)
        
        if not results:
            return "", 0.0
        
        texts = [r[1] for r in results]
        confs = [r[2] for r in results]
        
        text = " ".join(texts)
        conf = sum(confs) / len(confs) if confs else 0.0
        
        return text, conf
    
    def order_boxes(
        self, 
        detections: List[Dict],
        y_overlap_threshold: float = 0.5,
    ) -> List[List[Dict]]:
        """
        Order boxes into lines (top-to-bottom, left-to-right).
        
        Returns:
            List of lines, each line is a list of detections
        """
        if not detections:
            return []
        
        # Sort by y-center
        sorted_dets = sorted(
            detections, 
            key=lambda d: (d['box'][1] + d['box'][3]) / 2
        )
        
        lines = []
        used = set()
        
        for det in sorted_dets:
            if det['id'] in used:
                continue
            
            # Start new line
            line = [det]
            used.add(det['id'])
            det_y1, det_y2 = det['box'][1], det['box'][3]
            det_h = det_y2 - det_y1
            
            # Find overlapping boxes
            for other in sorted_dets:
                if other['id'] in used:
                    continue
                
                other_y1, other_y2 = other['box'][1], other['box'][3]
                other_h = other_y2 - other_y1
                
                # Calculate vertical overlap
                y_overlap = max(0, min(det_y2, other_y2) - max(det_y1, other_y1))
                min_h = min(det_h, other_h)
                overlap_ratio = y_overlap / min_h if min_h > 0 else 0
                
                if overlap_ratio >= y_overlap_threshold:
                    line.append(other)
                    used.add(other['id'])
            
            # Sort line left-to-right
            line.sort(key=lambda d: d['box'][0])
            lines.append(line)
        
        return lines
    
    def merge_text(self, lines: List[List[Dict]]) -> str:
        """Merge OCR text from all lines."""
        line_texts = []
        
        for line in lines:
            words = [det.get('ocr_text', '') for det in line]
            line_text = " ".join(w for w in words if w)
            if line_text:
                line_texts.append(line_text)
        
        return "\n".join(line_texts)
    
    def predict(
        self, 
        image_path: str,
        return_crops: bool = False,
    ) -> Dict:
        """
        Run full prediction pipeline.
        
        Args:
            image_path: Path to input image
            return_crops: Include crop images in result
            
        Returns:
            Dictionary with detections, lines, and aggregated text
        """
        start_time = time.time()
        
        # Load image
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        h, w = image.shape[:2]
        
        # Run detection
        detections = self.detect(image)
        
        # Run OCR in batch (MUCH FASTER)
        if detections and self.ocr_engine == 'trocr':
            # Extract all crops first
            crops = []
            valid_indices = []
            for i, det in enumerate(detections):
                crop = self.crop_region(image, det['box'])
                if crop.size > 0:
                    crops.append(crop)
                    valid_indices.append(i)
            
            # Batch OCR processing
            if crops:
                ocr_results = self._recognize_trocr_batch(crops)
                
                # Assign results back to detections
                for idx, (text, conf) in zip(valid_indices, ocr_results):
                    detections[idx]['ocr_text'] = text
                    detections[idx]['ocr_confidence'] = round(conf, 4)
                
                # Mark empty crops
                for i, det in enumerate(detections):
                    if i not in valid_indices:
                        det['ocr_text'] = ""
                        det['ocr_confidence'] = 0.0
        else:
            # Fallback: process one by one (for EasyOCR or no detections)
            for det in detections:
                crop = self.crop_region(image, det['box'])
                
                if crop.size == 0:
                    det['ocr_text'] = ""
                    det['ocr_confidence'] = 0.0
                    continue
                
                text, conf = self.recognize_text(crop)
                det['ocr_text'] = text
                det['ocr_confidence'] = round(conf, 4)
        
        # Order boxes into lines
        lines = self.order_boxes(detections)
        
        # Create line entries
        line_data = []
        for line_id, line in enumerate(lines):
            for det in line:
                det['line_id'] = line_id
            
            line_text = " ".join(
                det.get('ocr_text', '') for det in line
            ).strip()
            
            line_data.append({
                'line_id': line_id,
                'text': line_text,
                'box_ids': [det['id'] for det in line],
            })
        
        # Merge all text
        aggregated_text = self.merge_text(lines)
        
        processing_time = (time.time() - start_time) * 1000
        
        result = {
            'image_path': str(image_path),
            'image_size': {'width': w, 'height': h},
            'num_detections': len(detections),
            'detections': detections,
            'lines': line_data,
            'aggregated_text': aggregated_text,
            'processing_time_ms': round(processing_time, 2),
        }
        
        if return_crops:
            result['_crops'] = crops  # Internal use only
        
        return result
    
    def predict_batch(
        self, 
        image_paths: List[str],
        save_dir: str = None,
    ) -> List[Dict]:
        """
        Run prediction on multiple images.
        
        Args:
            image_paths: List of image paths
            save_dir: Directory to save individual results
            
        Returns:
            List of result dictionaries
        """
        from tqdm import tqdm
        
        results = []
        
        for img_path in tqdm(image_paths, desc="Processing"):
            try:
                result = self.predict(img_path)
                results.append(result)
                
                if save_dir:
                    save_path = Path(save_dir) / f"{Path(img_path).stem}.json"
                    save_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(save_path, 'w', encoding='utf-8') as f:
                        json.dump(result, f, indent=2, ensure_ascii=False)
                        
            except Exception as e:
                print(f"Error processing {img_path}: {e}")
                results.append({'error': str(e), 'image_path': str(img_path)})
        
        return results


def main():
    parser = argparse.ArgumentParser(
        description='End-to-end handwriting detection and OCR',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Input
    parser.add_argument('--image', '-i', type=str, required=True,
                       help='Path to input image or directory')
    
    # Models
    parser.add_argument('--detector', '-d', type=str, default=None,
                       help='Path to YOLO detector model')
    parser.add_argument('--ocr-model', type=str,
                       default='microsoft/trocr-large-handwritten',
                       help='TrOCR model name (use trocr-base-handwritten for 3x speed)')
    parser.add_argument('--ocr-engine', type=str, default='trocr',
                       choices=['trocr', 'easyocr'],
                       help='OCR engine to use')
    parser.add_argument('--fast', action='store_true',
                       help='Fast mode: use base model + greedy decoding (already optimized)')
    
    # Detection parameters
    parser.add_argument('--conf', type=float, default=0.25,
                       help='Detection confidence threshold')
    parser.add_argument('--iou', type=float, default=0.45,
                       help='NMS IoU threshold')
    parser.add_argument('--imgsz', type=int, default=640,
                       help='Detection image size')
    
    # Device
    parser.add_argument('--device', type=str, default=None,
                       help='Device (cuda/cpu)')
    parser.add_argument('--no-fp16', action='store_true',
                       help='Disable FP16')
    
    # Output
    parser.add_argument('--output', '-o', type=str, default=None,
                       help='Output JSON file or directory')
    parser.add_argument('--visualize', '-v', action='store_true',
                       help='Save visualization')
    parser.add_argument('--print-text', '-p', action='store_true',
                       help='Print recognized text')
    
    args = parser.parse_args()
    
    # Fast mode override
    if args.fast:
        args.ocr_model = 'microsoft/trocr-base-handwritten'
        print("🚀 Fast mode: Using TrOCR-base + batch processing")
    
    # Check dependencies
    deps = check_dependencies()
    if not deps['ultralytics']:
        print("⚠️  ultralytics not installed. Detector disabled.")
    if not deps['transformers'] and args.ocr_engine == 'trocr':
        print("❌ transformers not installed. Install with: uv pip install transformers")
        sys.exit(1)
    
    # Initialize pipeline
    pipeline = HandwritingOCR(
        detector_path=args.detector,
        ocr_model=args.ocr_model,
        ocr_engine=args.ocr_engine,
        device=args.device,
        use_fp16=not args.no_fp16,
        conf_threshold=args.conf,
        iou_threshold=args.iou,
        imgsz=args.imgsz,
    )
    
    input_path = Path(args.image)
    
    if input_path.is_file():
        # Single image
        print(f"\nProcessing: {input_path}")
        result = pipeline.predict(str(input_path))
        
        # Print text
        if args.print_text:
            print("\n" + "="*60)
            print(" RECOGNIZED TEXT")
            print("="*60)
            print(result['aggregated_text'])
            print("="*60)
        
        # Print summary
        print(f"\nDetections: {result['num_detections']}")
        print(f"Lines: {len(result['lines'])}")
        print(f"Processing time: {result['processing_time_ms']:.1f}ms")
        
        # Save output
        if args.output:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"\n✅ Result saved to: {output_path}")
        
        # Visualize
        if args.visualize:
            import sys
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from scripts.visualize import draw_results
            
            image = cv2.imread(str(input_path))
            vis_image = draw_results(image, result)
            
            vis_path = input_path.parent / f"{input_path.stem}_result.jpg"
            cv2.imwrite(str(vis_path), vis_image)
            print(f"✅ Visualization saved to: {vis_path}")
        
        # Print result as JSON if no output specified
        if not args.output and not args.print_text:
            print("\nResult:")
            print(json.dumps(result, indent=2))
    
    else:
        # Directory
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
        image_files = [
            f for f in input_path.iterdir()
            if f.suffix.lower() in image_extensions
        ]
        
        if not image_files:
            print(f"No images found in {input_path}")
            sys.exit(1)
        
        print(f"\nProcessing {len(image_files)} images...")
        
        output_dir = Path(args.output) if args.output else input_path / 'results'
        results = pipeline.predict_batch(
            [str(f) for f in image_files],
            save_dir=str(output_dir),
        )
        
        # Save combined results
        combined_path = output_dir / 'all_results.json'
        with open(combined_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Results saved to: {output_dir}")


if __name__ == "__main__":
    main()
