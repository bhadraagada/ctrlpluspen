"""
OCR Script for Handwriting Recognition
Runs TrOCR or EasyOCR on cropped detection regions
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

import cv2
import numpy as np
import torch
from PIL import Image
from tqdm import tqdm


def check_gpu():
    """Check GPU availability."""
    if torch.cuda.is_available():
        print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
        print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
        return True
    else:
        print("⚠️  No GPU available, using CPU")
        return False


class TrOCREngine:
    """TrOCR-based handwriting recognition."""
    
    def __init__(
        self,
        model_name: str = "microsoft/trocr-large-handwritten",  # Using LARGE model for better accuracy
        device: str = None,
        use_fp16: bool = True,
    ):
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.use_fp16 = use_fp16 and self.device == 'cuda'
        
        print(f"Loading TrOCR model: {model_name}")
        print(f"Device: {self.device}, FP16: {self.use_fp16}")
        
        self.processor = TrOCRProcessor.from_pretrained(model_name)
        self.model = VisionEncoderDecoderModel.from_pretrained(model_name)
        
        self.model.to(self.device)
        if self.use_fp16:
            self.model = self.model.half()
        
        self.model.eval()
        print("✅ TrOCR model loaded")
    
    def preprocess(self, image: np.ndarray) -> Image.Image:
        """Preprocess image for TrOCR."""
        # Convert BGR to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        elif len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        
        return Image.fromarray(image)
    
    def recognize(self, image: np.ndarray) -> Tuple[str, float]:
        """
        Recognize text in image.
        
        Args:
            image: Input image (numpy array)
            
        Returns:
            text: Recognized text
            confidence: Recognition confidence (placeholder, TrOCR doesn't provide this directly)
        """
        pil_image = self.preprocess(image)
        
        pixel_values = self.processor(
            pil_image, return_tensors="pt"
        ).pixel_values.to(self.device)
        
        if self.use_fp16:
            pixel_values = pixel_values.half()
        
        with torch.no_grad():
            generated_ids = self.model.generate(
                pixel_values,
                max_length=128,
                num_beams=4,
                early_stopping=True,
            )
        
        text = self.processor.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0]
        
        # TrOCR doesn't provide confidence scores directly
        # Use a placeholder or compute from logits if needed
        confidence = 0.9  # Placeholder
        
        return text.strip(), confidence
    
    def recognize_batch(
        self, 
        images: List[np.ndarray], 
        batch_size: int = 8
    ) -> List[Tuple[str, float]]:
        """Recognize text in batch of images."""
        results = []
        
        for i in range(0, len(images), batch_size):
            batch = images[i:i + batch_size]
            pil_images = [self.preprocess(img) for img in batch]
            
            pixel_values = self.processor(
                pil_images, return_tensors="pt", padding=True
            ).pixel_values.to(self.device)
            
            if self.use_fp16:
                pixel_values = pixel_values.half()
            
            with torch.no_grad():
                generated_ids = self.model.generate(
                    pixel_values,
                    max_length=128,
                    num_beams=4,
                    early_stopping=True,
                )
            
            texts = self.processor.batch_decode(
                generated_ids, skip_special_tokens=True
            )
            
            for text in texts:
                results.append((text.strip(), 0.9))
        
        return results


class EasyOCREngine:
    """EasyOCR-based text recognition (lighter weight alternative)."""
    
    def __init__(
        self,
        languages: List[str] = ['en'],
        use_gpu: bool = True,
    ):
        import easyocr
        
        print(f"Loading EasyOCR (languages: {languages})")
        self.reader = easyocr.Reader(languages, gpu=use_gpu)
        print("✅ EasyOCR loaded")
    
    def recognize(self, image: np.ndarray) -> Tuple[str, float]:
        """Recognize text in image."""
        results = self.reader.readtext(image)
        
        if not results:
            return "", 0.0
        
        # Combine all detected text
        texts = []
        confidences = []
        
        for (bbox, text, conf) in results:
            texts.append(text)
            confidences.append(conf)
        
        combined_text = " ".join(texts)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return combined_text, avg_confidence
    
    def recognize_batch(
        self, 
        images: List[np.ndarray], 
        batch_size: int = 8
    ) -> List[Tuple[str, float]]:
        """Recognize text in batch of images."""
        # EasyOCR doesn't have native batch support, process one by one
        results = []
        for img in images:
            text, conf = self.recognize(img)
            results.append((text, conf))
        return results


def load_ocr_engine(engine_type: str = 'trocr', **kwargs):
    """Load OCR engine."""
    if engine_type == 'trocr':
        return TrOCREngine(**kwargs)
    elif engine_type == 'easyocr':
        return EasyOCREngine(**kwargs)
    else:
        raise ValueError(f"Unknown OCR engine: {engine_type}")


def process_crops(
    ocr_engine,
    crops_dir: Path,
    output_dir: Path,
    batch_size: int = 8,
) -> Dict:
    """Process all crop images in directory."""
    
    # Find crop images
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
    crop_files = [
        f for f in crops_dir.iterdir()
        if f.suffix.lower() in image_extensions
    ]
    
    if not crop_files:
        print(f"No crop images found in {crops_dir}")
        return {}
    
    print(f"Found {len(crop_files)} crop images")
    
    # Load all images
    images = []
    valid_files = []
    
    for crop_path in crop_files:
        img = cv2.imread(str(crop_path))
        if img is not None:
            images.append(img)
            valid_files.append(crop_path)
    
    # Run OCR in batches
    print("Running OCR...")
    results_list = ocr_engine.recognize_batch(images, batch_size)
    
    # Compile results
    results = {
        'crops_dir': str(crops_dir),
        'num_crops': len(valid_files),
        'ocr_results': [],
    }
    
    for crop_path, (text, conf) in zip(valid_files, results_list):
        result = {
            'crop_path': str(crop_path),
            'crop_name': crop_path.name,
            'text': text,
            'confidence': round(conf, 4),
        }
        results['ocr_results'].append(result)
        
        # Print result
        print(f"  {crop_path.name}: '{text}' (conf: {conf:.3f})")
    
    # Save results
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / 'ocr_results.json'
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ OCR complete! Results saved to: {json_path}")
    
    return results


def process_detection_json(
    ocr_engine,
    detection_json: Path,
    output_dir: Path,
    batch_size: int = 8,
) -> Dict:
    """Process crops referenced in detection JSON file."""
    
    with open(detection_json, 'r') as f:
        detection_data = json.load(f)
    
    # Collect all crops
    crops_to_process = []
    
    if 'detections' in detection_data:
        # Single image format
        for det in detection_data['detections']:
            if 'crop_path' in det:
                crops_to_process.append((det, Path(det['crop_path'])))
    elif 'images' in detection_data:
        # Multi-image format
        for img_data in detection_data['images']:
            for det in img_data.get('detections', []):
                if 'crop_path' in det:
                    crops_to_process.append((det, Path(det['crop_path'])))
    
    if not crops_to_process:
        print("No crop paths found in detection JSON")
        return {}
    
    print(f"Processing {len(crops_to_process)} crops from detection JSON")
    
    # Load images
    images = []
    valid_crops = []
    
    for det, crop_path in crops_to_process:
        if crop_path.exists():
            img = cv2.imread(str(crop_path))
            if img is not None:
                images.append(img)
                valid_crops.append((det, crop_path))
    
    # Run OCR
    print("Running OCR...")
    results_list = ocr_engine.recognize_batch(images, batch_size)
    
    # Update detections with OCR results
    for (det, crop_path), (text, conf) in zip(valid_crops, results_list):
        det['ocr_text'] = text
        det['ocr_confidence'] = round(conf, 4)
        print(f"  {crop_path.name}: '{text}' (conf: {conf:.3f})")
    
    # Save updated JSON
    output_dir.mkdir(parents=True, exist_ok=True)
    output_json = output_dir / 'detections_with_ocr.json'
    
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(detection_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ OCR complete! Updated JSON saved to: {output_json}")
    
    return detection_data


def main():
    parser = argparse.ArgumentParser(
        description='Run OCR on cropped handwriting regions',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Input options
    parser.add_argument('--crops', '-c', type=str,
                       help='Path to crops directory')
    parser.add_argument('--detection-json', '-d', type=str,
                       help='Path to detection JSON file (alternative to --crops)')
    
    # OCR engine options
    parser.add_argument('--engine', '-e', type=str, default='trocr',
                       choices=['trocr', 'easyocr'],
                       help='OCR engine to use')
    parser.add_argument('--model', '-m', type=str, 
                       default='microsoft/trocr-base-handwritten',
                       help='TrOCR model name (for trocr engine)')
    parser.add_argument('--languages', type=str, nargs='+', default=['en'],
                       help='Languages for EasyOCR')
    
    # Processing options
    parser.add_argument('--batch-size', '-b', type=int, default=8,
                       help='Batch size for OCR')
    parser.add_argument('--device', type=str, default=None,
                       help='Device (cuda/cpu)')
    parser.add_argument('--no-fp16', action='store_true',
                       help='Disable FP16 inference')
    
    # Output
    parser.add_argument('--output', '-o', type=str, default='./outputs/ocr',
                       help='Output directory')
    
    args = parser.parse_args()
    
    # Validate inputs
    if not args.crops and not args.detection_json:
        print("❌ Either --crops or --detection-json is required")
        sys.exit(1)
    
    # Check GPU
    has_gpu = check_gpu()
    
    # Load OCR engine
    if args.engine == 'trocr':
        device = args.device or ('cuda' if has_gpu else 'cpu')
        ocr_engine = load_ocr_engine(
            'trocr',
            model_name=args.model,
            device=device,
            use_fp16=not args.no_fp16 and device == 'cuda',
        )
    else:
        ocr_engine = load_ocr_engine(
            'easyocr',
            languages=args.languages,
            use_gpu=has_gpu,
        )
    
    output_dir = Path(args.output)
    
    # Process based on input type
    if args.detection_json:
        detection_json = Path(args.detection_json)
        if not detection_json.exists():
            print(f"❌ Detection JSON not found: {detection_json}")
            sys.exit(1)
        
        process_detection_json(
            ocr_engine=ocr_engine,
            detection_json=detection_json,
            output_dir=output_dir,
            batch_size=args.batch_size,
        )
    else:
        crops_dir = Path(args.crops)
        if not crops_dir.exists():
            print(f"❌ Crops directory not found: {crops_dir}")
            sys.exit(1)
        
        process_crops(
            ocr_engine=ocr_engine,
            crops_dir=crops_dir,
            output_dir=output_dir,
            batch_size=args.batch_size,
        )


if __name__ == "__main__":
    main()
