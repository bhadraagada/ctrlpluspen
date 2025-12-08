"""
Environment Check Script
Validates CUDA, GPU, and package installations for RTX 3050
"""

import sys
import os
from pathlib import Path

def print_header(title: str):
    """Print formatted header."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def check_python():
    """Check Python version."""
    print_header("Python Environment")
    print(f"Python Version: {sys.version}")
    print(f"Python Executable: {sys.executable}")
    print(f"Platform: {sys.platform}")
    
    version = sys.version_info
    if version.major == 3 and version.minor >= 10:
        print("✅ Python version OK (3.10+)")
        return True
    else:
        print("❌ Python 3.10+ recommended")
        return False

def check_cuda():
    """Check CUDA and GPU availability."""
    print_header("CUDA & GPU Check")
    
    try:
        import torch
        print(f"PyTorch Version: {torch.__version__}")
        print(f"CUDA Available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"CUDA Version: {torch.version.cuda}")
            print(f"cuDNN Version: {torch.backends.cudnn.version()}")
            print(f"GPU Count: {torch.cuda.device_count()}")
            
            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                vram_gb = props.total_memory / (1024**3)
                print(f"\nGPU {i}: {props.name}")
                print(f"  - VRAM: {vram_gb:.1f} GB")
                print(f"  - Compute Capability: {props.major}.{props.minor}")
                print(f"  - Multi-Processor Count: {props.multi_processor_count}")
                
                if "3050" in props.name:
                    print("  ✅ RTX 3050 detected - using optimized settings")
                    if vram_gb < 8:
                        print("  ⚠️  Less than 8GB VRAM - use conservative settings")
            
            # Test CUDA operations
            print("\nTesting CUDA operations...")
            x = torch.randn(1000, 1000, device='cuda')
            y = torch.matmul(x, x)
            del x, y
            torch.cuda.empty_cache()
            print("✅ CUDA operations working")
            
            # Check memory
            free_mem = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
            print(f"✅ Free VRAM: {free_mem / (1024**3):.2f} GB")
            
            return True
        else:
            print("❌ CUDA not available!")
            print("\nTroubleshooting:")
            print("1. Install CUDA-enabled PyTorch:")
            print("   uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")
            print("2. Check NVIDIA driver: nvidia-smi")
            print("3. Verify CUDA toolkit installation")
            return False
            
    except ImportError:
        print("❌ PyTorch not installed!")
        print("Install with: uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")
        return False

def check_packages():
    """Check required packages."""
    print_header("Package Check")
    
    packages = {
        'ultralytics': 'YOLOv8',
        'transformers': 'TrOCR',
        'easyocr': 'EasyOCR (backup)',
        'cv2': 'OpenCV',
        'PIL': 'Pillow',
        'numpy': 'NumPy',
        'pandas': 'Pandas',
        'matplotlib': 'Matplotlib',
        'yaml': 'PyYAML',
        'tqdm': 'tqdm',
        'jiwer': 'WER/CER metrics',
        'editdistance': 'Edit distance',
        'albumentations': 'Augmentation',
        'rich': 'Rich console',
    }
    
    all_ok = True
    for package, description in packages.items():
        try:
            if package == 'cv2':
                import cv2
                version = cv2.__version__
            elif package == 'PIL':
                from PIL import Image
                import PIL
                version = PIL.__version__
            elif package == 'yaml':
                import yaml
                version = yaml.__version__
            else:
                module = __import__(package)
                version = getattr(module, '__version__', 'installed')
            print(f"✅ {description}: {version}")
        except ImportError:
            print(f"❌ {description}: NOT INSTALLED")
            all_ok = False
    
    return all_ok

def check_ultralytics():
    """Check Ultralytics YOLO specifically."""
    print_header("Ultralytics YOLOv8 Check")
    
    try:
        from ultralytics import YOLO
        import ultralytics
        print(f"Ultralytics Version: {ultralytics.__version__}")
        
        # Check if we can load a model
        print("Loading YOLOv8n model (may download on first run)...")
        model = YOLO('yolov8n.pt')
        print(f"✅ Model loaded: {model.model_name}")
        
        # Check device
        print(f"Default device: {model.device}")
        
        return True
    except Exception as e:
        print(f"❌ Ultralytics error: {e}")
        return False

def check_transformers():
    """Check Transformers/TrOCR."""
    print_header("Transformers (TrOCR) Check")
    
    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        import transformers
        print(f"Transformers Version: {transformers.__version__}")
        
        print("TrOCR models available (download on first use):")
        print("  - microsoft/trocr-base-handwritten")
        print("  - microsoft/trocr-large-handwritten")
        print("✅ Transformers ready")
        
        return True
    except Exception as e:
        print(f"❌ Transformers error: {e}")
        return False

def check_directories():
    """Check project directory structure."""
    print_header("Directory Structure")
    
    base_path = Path(__file__).parent.parent
    required_dirs = [
        'configs',
        'scripts', 
        'data',
        'models',
        'outputs',
    ]
    
    all_ok = True
    for dir_name in required_dirs:
        dir_path = base_path / dir_name
        if dir_path.exists():
            print(f"✅ {dir_name}/")
        else:
            print(f"❌ {dir_name}/ - Creating...")
            dir_path.mkdir(parents=True, exist_ok=True)
            all_ok = False
    
    # Check for config files
    config_files = ['rtx3050.yaml', 'quick_test.yaml', 'data.yaml']
    for config in config_files:
        config_path = base_path / 'configs' / config
        if config_path.exists():
            print(f"✅ configs/{config}")
        else:
            print(f"⚠️  configs/{config} - Not found")
    
    return all_ok

def print_recommendations():
    """Print RTX 3050 specific recommendations."""
    print_header("RTX 3050 Recommendations")
    
    print("""
Optimized Settings for 8GB VRAM:
--------------------------------
• Image Size: 640 (reduce to 512 if OOM)
• Batch Size: 4 (reduce to 2 if OOM)  
• AMP: ENABLED (critical for memory)
• Gradient Accumulation: 4 (effective batch = 16)
• Workers: 4 (reduce if RAM issues)
• Cache: DISABLED

If you encounter OOM errors:
1. Reduce batch size: --batch 2
2. Reduce image size: --imgsz 512
3. Reduce workers: --workers 2
4. Close other GPU applications
5. Check nvidia-smi for memory usage

Training Commands:
-----------------
# Quick test (5 min)
python scripts/quick_test.py --samples 100

# Full training
python scripts/train_detector.py --config configs/rtx3050.yaml

# Monitor GPU
nvidia-smi -l 1
""")

def main():
    """Run all environment checks."""
    print("\n" + "🖊️ "*20)
    print("  HANDWRITING OCR - ENVIRONMENT CHECK")
    print("  RTX 3050 Optimized Pipeline")
    print("🖊️ "*20)
    
    results = {
        'python': check_python(),
        'cuda': check_cuda(),
        'packages': check_packages(),
        'ultralytics': check_ultralytics(),
        'transformers': check_transformers(),
        'directories': check_directories(),
    }
    
    print_recommendations()
    
    print_header("Summary")
    all_passed = all(results.values())
    
    for check, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {check}: {status}")
    
    print()
    if all_passed:
        print("🎉 All checks passed! Ready to train.")
        print("\nNext steps:")
        print("1. Download IAM dataset and place in ./data/iam/")
        print("2. Run: python scripts/convert_to_yolo.py")
        print("3. Run: python scripts/quick_test.py --samples 100")
        return 0
    else:
        print("⚠️  Some checks failed. Please fix issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
