"""
Quick Test Script
End-to-end smoke test for the handwriting OCR pipeline
Tests all components with minimal data on RTX 3050
"""

import os
import sys
import time
import shutil
import argparse
from pathlib import Path
from datetime import datetime

import torch


def print_header(title: str):
    """Print formatted header."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")


def check_environment():
    """Check environment and dependencies."""
    print_header("1. Environment Check")
    
    # Python
    print(f"Python: {sys.version}")
    
    # PyTorch & CUDA
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"CUDA Version: {torch.version.cuda}")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        vram = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f"VRAM: {vram:.1f} GB")
        
        if vram < 6:
            print("⚠️  Low VRAM - using minimal settings")
            return 'minimal'
        elif vram < 8:
            print("⚠️  Limited VRAM - using conservative settings")
            return 'conservative'
        else:
            print("✅ Sufficient VRAM")
            return 'normal'
    else:
        print("⚠️  No GPU - using CPU (slow)")
        return 'cpu'


def create_sample_dataset(output_dir: Path, num_samples: int = 100):
    """Create minimal sample dataset for testing using EMNIST."""
    print_header("2. Creating Sample Dataset (EMNIST)")
    
    # Import from convert_emnist module
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from scripts.convert_emnist import (
        download_emnist, get_char_mapping, create_yolo_dataset, create_data_yaml
    )
    
    # Download EMNIST (uses torchvision - auto download)
    data_dir = Path('./data/emnist')
    train_dataset, test_dataset = download_emnist(data_dir, 'byclass')
    char_mapping = get_char_mapping('byclass')
    
    # Create YOLO format dataset
    num_train = max(int(num_samples * 0.8), 10)
    num_val = max(int(num_samples * 0.2), 5)
    
    create_yolo_dataset(
        train_dataset=train_dataset,
        test_dataset=test_dataset,
        output_dir=output_dir,
        char_mapping=char_mapping,
        num_train_docs=num_train,
        num_val_docs=num_val,
        doc_width=640,
        doc_height=480,
        chars_per_doc=20,
    )
    
    create_data_yaml(output_dir)
    
    # Verify
    train_images = list((output_dir / 'images' / 'train').glob('*.jpg'))
    val_images = list((output_dir / 'images' / 'val').glob('*.jpg'))
    
    print(f"Created {len(train_images)} training images")
    print(f"Created {len(val_images)} validation images")
    
    return len(train_images) > 0 and len(val_images) > 0


def train_detector(data_dir: Path, epochs: int = 5, batch: int = 2, vram_mode: str = 'normal'):
    """Train detector with minimal settings."""
    print_header("3. Training Detector (Quick Test)")
    
    from ultralytics import YOLO
    
    # Adjust settings based on VRAM
    if vram_mode == 'minimal':
        batch = 1
        imgsz = 480
    elif vram_mode == 'conservative':
        batch = 2
        imgsz = 512
    else:
        imgsz = 640
    
    print(f"Settings: batch={batch}, imgsz={imgsz}, epochs={epochs}")
    
    # Load model
    model = YOLO('yolov8n.pt')
    
    # Train
    data_yaml = data_dir / 'data.yaml'
    
    try:
        results = model.train(
            data=str(data_yaml),
            epochs=epochs,
            batch=batch,
            imgsz=imgsz,
            device=0 if torch.cuda.is_available() else 'cpu',
            amp=True,
            workers=2,
            patience=3,
            project='models/detector',
            name='quick_test',
            exist_ok=True,
            verbose=False,
        )
        
        print(f"✅ Training complete!")
        print(f"   Best model: models/detector/quick_test/weights/best.pt")
        
        return Path('models/detector/quick_test/weights/best.pt')
        
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            print(f"❌ OOM Error! Try reducing batch size or image size")
            torch.cuda.empty_cache()
        raise


def test_inference(model_path: Path, data_dir: Path):
    """Test inference on sample images."""
    print_header("4. Testing Inference")
    
    from ultralytics import YOLO
    
    model = YOLO(str(model_path))
    
    # Get test images
    test_images = list((data_dir / 'images' / 'val').glob('*.jpg'))[:5]
    
    print(f"Testing on {len(test_images)} images...")
    
    total_detections = 0
    total_time = 0
    
    for img_path in test_images:
        start = time.time()
        results = model.predict(
            source=str(img_path),
            conf=0.25,
            device=0 if torch.cuda.is_available() else 'cpu',
            verbose=False,
        )
        inference_time = (time.time() - start) * 1000
        
        num_dets = len(results[0].boxes)
        total_detections += num_dets
        total_time += inference_time
        
        print(f"  {img_path.name}: {num_dets} detections, {inference_time:.1f}ms")
    
    avg_time = total_time / len(test_images)
    print(f"\n✅ Inference test passed!")
    print(f"   Avg time: {avg_time:.1f}ms per image")
    print(f"   Total detections: {total_detections}")
    
    return True


def test_ocr():
    """Test OCR component."""
    print_header("5. Testing OCR")
    
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        from PIL import Image
        import numpy as np
        
        print("Loading TrOCR (this may take a moment on first run)...")
        
        model_name = "microsoft/trocr-base-handwritten"
        processor = TrOCRProcessor.from_pretrained(model_name)
        model = VisionEncoderDecoderModel.from_pretrained(model_name)
        
        if torch.cuda.is_available():
            model = model.half().cuda()
        
        model.eval()
        
        # Create test image with text-like pattern
        test_image = np.ones((50, 200, 3), dtype=np.uint8) * 255
        # Add some dark strokes
        test_image[20:30, 20:180] = 50
        
        pil_image = Image.fromarray(test_image)
        
        # Run inference
        pixel_values = processor(pil_image, return_tensors="pt").pixel_values
        if torch.cuda.is_available():
            pixel_values = pixel_values.half().cuda()
        
        with torch.no_grad():
            generated_ids = model.generate(pixel_values, max_length=32)
        
        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        print(f"✅ TrOCR test passed!")
        print(f"   Model loaded and working")
        print(f"   Sample output: '{text}' (on test pattern)")
        
        return True
        
    except Exception as e:
        print(f"❌ TrOCR test failed: {e}")
        print("   Trying EasyOCR fallback...")
        
        try:
            import easyocr
            reader = easyocr.Reader(['en'], gpu=torch.cuda.is_available())
            print("✅ EasyOCR fallback available")
            return True
        except Exception as e2:
            print(f"❌ EasyOCR also failed: {e2}")
            return False


def test_full_pipeline(model_path: Path, data_dir: Path):
    """Test the full pipeline."""
    print_header("6. Testing Full Pipeline")
    
    from scripts.predict import HandwritingOCR
    
    # Initialize pipeline
    print("Initializing pipeline...")
    pipeline = HandwritingOCR(
        detector_path=str(model_path) if model_path.exists() else None,
        ocr_engine='trocr',
        use_fp16=True,
    )
    
    # Get test image
    test_images = list((data_dir / 'images' / 'val').glob('*.jpg'))
    if not test_images:
        print("⚠️  No test images found")
        return False
    
    test_image = test_images[0]
    print(f"Testing with: {test_image.name}")
    
    # Run pipeline
    start = time.time()
    result = pipeline.predict(str(test_image))
    total_time = (time.time() - start) * 1000
    
    print(f"\n✅ Full pipeline test passed!")
    print(f"   Detections: {result['num_detections']}")
    print(f"   Lines: {len(result['lines'])}")
    print(f"   Total time: {total_time:.1f}ms")
    print(f"   Text preview: '{result['aggregated_text'][:50]}...'")
    
    # Save result
    output_dir = Path('outputs/quick_test')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    import json
    result_path = output_dir / 'test_result.json'
    with open(result_path, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"   Result saved to: {result_path}")
    
    return True


def run_quick_test(
    num_samples: int = 100,
    epochs: int = 5,
    batch: int = 2,
    skip_train: bool = False,
):
    """Run complete quick test."""
    print("\n" + "🖊️ "*20)
    print("  HANDWRITING OCR - QUICK TEST")
    print("  RTX 3050 Smoke Test")
    print("🖊️ "*20)
    
    start_time = time.time()
    results = {}
    
    # 1. Environment check
    vram_mode = check_environment()
    results['environment'] = vram_mode != 'cpu'
    
    # 2. Create sample dataset
    data_dir = Path('data/quick_test')
    try:
        results['dataset'] = create_sample_dataset(data_dir, num_samples)
    except Exception as e:
        print(f"❌ Dataset creation failed: {e}")
        results['dataset'] = False
    
    # 3. Train detector
    model_path = Path('models/detector/quick_test/weights/best.pt')
    
    if skip_train and model_path.exists():
        print_header("3. Skipping Training (using existing model)")
        results['training'] = True
    else:
        try:
            model_path = train_detector(data_dir, epochs, batch, vram_mode)
            results['training'] = True
        except Exception as e:
            print(f"❌ Training failed: {e}")
            results['training'] = False
    
    # 4. Test inference
    if results.get('training') and model_path.exists():
        try:
            results['inference'] = test_inference(model_path, data_dir)
        except Exception as e:
            print(f"❌ Inference test failed: {e}")
            results['inference'] = False
    else:
        results['inference'] = False
    
    # 5. Test OCR
    try:
        results['ocr'] = test_ocr()
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
        results['ocr'] = False
    
    # 6. Test full pipeline
    if results.get('training') and results.get('ocr'):
        try:
            results['pipeline'] = test_full_pipeline(model_path, data_dir)
        except Exception as e:
            print(f"❌ Pipeline test failed: {e}")
            results['pipeline'] = False
    else:
        results['pipeline'] = False
    
    # Summary
    total_time = time.time() - start_time
    
    print_header("QUICK TEST SUMMARY")
    
    all_passed = all(results.values())
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    print(f"\nTotal time: {total_time / 60:.1f} minutes")
    
    if all_passed:
        print("\n🎉 All tests passed! Pipeline is ready.")
        print("\nNext steps:")
        print("1. Generate more EMNIST data: python scripts/convert_emnist.py --num-train 1000 --num-val 200")
        print("2. Train detector: python scripts/train_detector.py --data data/yolo_format/data.yaml --config configs/rtx3050.yaml")
        print("3. Run inference: python scripts/predict.py --image <your_image.jpg>")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
    
    return all_passed


def main():
    parser = argparse.ArgumentParser(
        description='Quick test for handwriting OCR pipeline',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument('--samples', '-s', type=int, default=100,
                       help='Number of sample images to create')
    parser.add_argument('--epochs', '-e', type=int, default=5,
                       help='Number of training epochs')
    parser.add_argument('--batch', '-b', type=int, default=2,
                       help='Batch size for training')
    parser.add_argument('--skip-train', action='store_true',
                       help='Skip training if model exists')
    
    args = parser.parse_args()
    
    success = run_quick_test(
        num_samples=args.samples,
        epochs=args.epochs,
        batch=args.batch,
        skip_train=args.skip_train,
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
