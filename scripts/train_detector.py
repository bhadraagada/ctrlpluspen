"""
YOLOv8 Handwriting Detection Training Script
Optimized for NVIDIA RTX 3050 (8GB VRAM)
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime
import yaml

import torch
from ultralytics import YOLO


def check_gpu():
    """Check GPU availability and print info."""
    print("\n" + "="*60)
    print(" GPU Check")
    print("="*60)
    
    if not torch.cuda.is_available():
        print("❌ CUDA not available! Training will use CPU (very slow)")
        print("Install CUDA-enabled PyTorch:")
        print("  uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
        return False
    
    device = torch.cuda.current_device()
    gpu_name = torch.cuda.get_device_name(device)
    vram = torch.cuda.get_device_properties(device).total_memory / (1024**3)
    
    print(f"✅ GPU: {gpu_name}")
    print(f"✅ VRAM: {vram:.1f} GB")
    print(f"✅ CUDA: {torch.version.cuda}")
    
    if vram < 6:
        print("⚠️  Less than 6GB VRAM - use minimal settings!")
    elif vram < 8:
        print("⚠️  Less than 8GB VRAM - use conservative settings")
    
    return True


def load_config(config_path: Path) -> dict:
    """Load training configuration from YAML file."""
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    return config


def get_rtx3050_defaults() -> dict:
    """Get default training parameters optimized for RTX 3050."""
    return {
        'epochs': 50,
        'batch': 4,
        'imgsz': 640,
        'device': 0,
        'amp': True,
        'workers': 4,
        'cache': False,
        'patience': 10,
        'save_period': 5,
        'exist_ok': True,
        'pretrained': True,
        'optimizer': 'AdamW',
        'lr0': 0.001,
        'lrf': 0.01,
        'momentum': 0.937,
        'weight_decay': 0.0005,
        'warmup_epochs': 3,
        'box': 7.5,
        'cls': 0.5,
        'dfl': 1.5,
        'hsv_h': 0.015,
        'hsv_s': 0.7,
        'hsv_v': 0.4,
        'degrees': 5.0,
        'translate': 0.1,
        'scale': 0.3,
        'shear': 2.0,
        'perspective': 0.0001,
        'flipud': 0.0,  # Disabled for text
        'fliplr': 0.0,  # Disabled for text
        'mosaic': 0.5,
        'mixup': 0.1,
        'copy_paste': 0.0,
    }


def train(
    data: str,
    model: str = 'yolov8n.pt',
    config: str = None,
    epochs: int = None,
    batch: int = None,
    imgsz: int = None,
    device: str = None,
    project: str = 'models/detector',
    name: str = None,
    resume: str = None,
    amp: bool = True,
    workers: int = None,
    patience: int = None,
    save_period: int = None,
    verbose: bool = True,
):
    """
    Train YOLOv8 for handwriting detection.
    
    Args:
        data: Path to data.yaml
        model: Model to use (yolov8n.pt, yolov8s.pt, etc.)
        config: Path to config YAML file
        epochs: Number of training epochs
        batch: Batch size
        imgsz: Image size
        device: Device to use (0, cpu, etc.)
        project: Project directory
        name: Experiment name
        resume: Path to checkpoint to resume from
        amp: Use automatic mixed precision
        workers: Number of dataloader workers
        patience: Early stopping patience
        save_period: Save checkpoint every N epochs
        verbose: Print verbose output
    """
    
    # Check GPU
    has_gpu = check_gpu()
    
    # Load defaults
    params = get_rtx3050_defaults()
    
    # Load config file if provided
    if config:
        config_path = Path(config)
        if config_path.exists():
            print(f"\nLoading config from {config_path}")
            file_config = load_config(config_path)
            params.update(file_config)
    
    # Override with CLI arguments
    if epochs is not None:
        params['epochs'] = epochs
    if batch is not None:
        params['batch'] = batch
    if imgsz is not None:
        params['imgsz'] = imgsz
    if device is not None:
        params['device'] = device
    elif not has_gpu:
        params['device'] = 'cpu'
    if workers is not None:
        params['workers'] = workers
    if patience is not None:
        params['patience'] = patience
    if save_period is not None:
        params['save_period'] = save_period
    params['amp'] = amp
    
    # Set project and name
    params['project'] = project
    if name:
        params['name'] = name
    else:
        params['name'] = f"handwriting_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Handle resume
    if resume:
        print(f"\n🔄 Resuming training from {resume}")
        yolo_model = YOLO(resume)
        params['resume'] = True
    else:
        print(f"\n📦 Loading model: {model}")
        yolo_model = YOLO(model)
    
    # Print configuration
    print("\n" + "="*60)
    print(" Training Configuration")
    print("="*60)
    print(f"Data: {data}")
    print(f"Model: {model}")
    print(f"Epochs: {params['epochs']}")
    print(f"Batch size: {params['batch']}")
    print(f"Image size: {params['imgsz']}")
    print(f"Device: {params['device']}")
    print(f"AMP (Mixed Precision): {params['amp']}")
    print(f"Workers: {params['workers']}")
    print(f"Project: {params['project']}")
    print(f"Name: {params['name']}")
    
    # Memory estimate
    if has_gpu:
        if params['batch'] == 4 and params['imgsz'] == 640:
            print("\n💾 Estimated VRAM usage: 3-4 GB (YOLOv8n)")
        elif params['batch'] == 2:
            print("\n💾 Estimated VRAM usage: 2-3 GB")
        print("   Monitor with: nvidia-smi -l 1")
    
    print("\n" + "="*60)
    print(" Starting Training...")
    print("="*60)
    
    try:
        # Train
        results = yolo_model.train(
            data=data,
            epochs=params['epochs'],
            batch=params['batch'],
            imgsz=params['imgsz'],
            device=params['device'],
            amp=params['amp'],
            workers=params['workers'],
            patience=params['patience'],
            save=True,
            save_period=params['save_period'],
            cache=params['cache'],
            exist_ok=params['exist_ok'],
            pretrained=params['pretrained'],
            optimizer=params['optimizer'],
            lr0=params['lr0'],
            lrf=params['lrf'],
            momentum=params['momentum'],
            weight_decay=params['weight_decay'],
            warmup_epochs=params['warmup_epochs'],
            box=params['box'],
            cls=params['cls'],
            dfl=params['dfl'],
            hsv_h=params['hsv_h'],
            hsv_s=params['hsv_s'],
            hsv_v=params['hsv_v'],
            degrees=params['degrees'],
            translate=params['translate'],
            scale=params['scale'],
            shear=params['shear'],
            perspective=params['perspective'],
            flipud=params['flipud'],
            fliplr=params['fliplr'],
            mosaic=params['mosaic'],
            mixup=params['mixup'],
            copy_paste=params['copy_paste'],
            project=params['project'],
            name=params['name'],
            verbose=verbose,
        )
        
        print("\n" + "="*60)
        print(" Training Complete!")
        print("="*60)
        
        # Print results location
        save_dir = Path(params['project']) / params['name']
        print(f"\nResults saved to: {save_dir}")
        print(f"Best model: {save_dir / 'weights' / 'best.pt'}")
        print(f"Last model: {save_dir / 'weights' / 'last.pt'}")
        
        # Print final metrics
        if hasattr(results, 'results_dict'):
            print("\nFinal Metrics:")
            for key, value in results.results_dict.items():
                if isinstance(value, float):
                    print(f"  {key}: {value:.4f}")
        
        return results
        
    except RuntimeError as e:
        if "out of memory" in str(e).lower():
            print("\n❌ OUT OF MEMORY ERROR!")
            print("\nTry these fixes:")
            print("1. Reduce batch size: --batch 2 or --batch 1")
            print("2. Reduce image size: --imgsz 512 or --imgsz 480")
            print("3. Reduce workers: --workers 2")
            print("4. Close other GPU applications")
            print("5. Check nvidia-smi for memory usage")
            torch.cuda.empty_cache()
        raise


def validate(
    model: str,
    data: str,
    imgsz: int = 640,
    batch: int = 4,
    device: str = '0',
    save_json: bool = False,
    verbose: bool = True,
):
    """Run validation on trained model."""
    print("\n" + "="*60)
    print(" Running Validation")
    print("="*60)
    
    yolo_model = YOLO(model)
    
    results = yolo_model.val(
        data=data,
        imgsz=imgsz,
        batch=batch,
        device=device,
        save_json=save_json,
        verbose=verbose,
    )
    
    print("\nValidation Results:")
    print(f"  mAP@0.5: {results.box.map50:.4f}")
    print(f"  mAP@0.5:0.95: {results.box.map:.4f}")
    print(f"  Precision: {results.box.mp:.4f}")
    print(f"  Recall: {results.box.mr:.4f}")
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description='Train YOLOv8 for handwriting detection (RTX 3050 optimized)',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Required arguments
    parser.add_argument('--data', '-d', type=str, default='./data/yolo_format/data.yaml',
                       help='Path to data.yaml')
    
    # Model arguments
    parser.add_argument('--model', '-m', type=str, default='yolov8n.pt',
                       choices=['yolov8n.pt', 'yolov8s.pt', 'yolov8m.pt', 'yolov8l.pt'],
                       help='Model to use')
    parser.add_argument('--config', '-c', type=str, default=None,
                       help='Path to config YAML file')
    parser.add_argument('--resume', '-r', type=str, default=None,
                       help='Path to checkpoint to resume from')
    
    # Training parameters (RTX 3050 optimized defaults)
    parser.add_argument('--epochs', '-e', type=int, default=50,
                       help='Number of epochs')
    parser.add_argument('--batch', '-b', type=int, default=4,
                       help='Batch size (reduce to 2 if OOM)')
    parser.add_argument('--imgsz', type=int, default=640,
                       help='Image size (reduce to 512 if OOM)')
    parser.add_argument('--device', type=str, default='0',
                       help='Device (0 for GPU, cpu for CPU)')
    parser.add_argument('--workers', '-w', type=int, default=4,
                       help='Number of dataloader workers')
    
    # Memory optimization
    parser.add_argument('--no-amp', action='store_true',
                       help='Disable automatic mixed precision')
    
    # Output
    parser.add_argument('--project', '-p', type=str, default='models/detector',
                       help='Project directory')
    parser.add_argument('--name', '-n', type=str, default=None,
                       help='Experiment name')
    
    # Early stopping
    parser.add_argument('--patience', type=int, default=10,
                       help='Early stopping patience')
    parser.add_argument('--save-period', type=int, default=5,
                       help='Save checkpoint every N epochs')
    
    # Validation mode
    parser.add_argument('--val', action='store_true',
                       help='Run validation only')
    
    # Verbosity
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Reduce output verbosity')
    
    args = parser.parse_args()
    
    # Check data file exists
    data_path = Path(args.data)
    if not data_path.exists():
        print(f"❌ Data file not found: {data_path}")
        print("\nCreate dataset first:")
        print("  python scripts/convert_to_yolo.py --create-sample")
        print("  # OR download IAM dataset and run:")
        print("  python scripts/convert_to_yolo.py --input ./data/iam")
        sys.exit(1)
    
    if args.val:
        # Validation only
        if not args.resume:
            print("❌ --resume required for validation mode")
            sys.exit(1)
        validate(
            model=args.resume,
            data=args.data,
            imgsz=args.imgsz,
            batch=args.batch,
            device=args.device,
            verbose=not args.quiet,
        )
    else:
        # Training
        train(
            data=args.data,
            model=args.model,
            config=args.config,
            epochs=args.epochs,
            batch=args.batch,
            imgsz=args.imgsz,
            device=args.device,
            project=args.project,
            name=args.name,
            resume=args.resume,
            amp=not args.no_amp,
            workers=args.workers,
            patience=args.patience,
            save_period=args.save_period,
            verbose=not args.quiet,
        )


if __name__ == "__main__":
    main()
