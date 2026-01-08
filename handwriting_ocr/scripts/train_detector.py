#!/usr/bin/env python3
"""
Train YOLOv8 handwriting detection model
Optimized for RTX 3050 (6GB VRAM)
"""

import argparse
import yaml
from pathlib import Path
from ultralytics import YOLO
import torch


def train_model(config_path, data_yaml=None, epochs=None, device=None):
    """Train YOLOv8 model with given configuration"""

    # Load config
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    # Override config with command line args
    if data_yaml:
        config["data"] = data_yaml
    if epochs:
        config["epochs"] = epochs
    if device is not None:
        config["device"] = device

    # Print configuration
    print("=" * 60)
    print("🚀 Training Configuration")
    print("=" * 60)
    print(f"Model: {config.get('model', 'yolov8n.pt')}")
    print(f"Data: {config.get('data', 'Not specified')}")
    print(f"Epochs: {config.get('epochs', 50)}")
    print(f"Batch Size: {config.get('batch', 2)}")
    print(f"Image Size: {config.get('imgsz', 640)}")
    print(f"Device: {config.get('device', 'cuda')}")
    print(f"Mixed Precision: {config.get('amp', True)}")
    print("=" * 60)

    # Check CUDA availability
    if torch.cuda.is_available():
        print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
        print(f"✅ CUDA Version: {torch.version.cuda}")
        print(f"✅ Available VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    else:
        print("⚠️  Warning: CUDA not available, training will be slow on CPU!")
    print("=" * 60)

    # Validate data path
    data_path = config.get("data")
    if not data_path:
        raise ValueError("Data path not specified! Use --data argument or set in config")

    if not Path(data_path).exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    print(f"\n📊 Loading dataset from: {data_path}")

    # Load model
    model_name = config.get("model", "yolov8n.pt")
    print(f"\n🔧 Loading model: {model_name}")
    model = YOLO(model_name)

    # Start training
    print(f"\n🏋️  Starting training for {config.get('epochs', 50)} epochs...")
    print("=" * 60)

    try:
        results = model.train(
            data=config.get("data"),
            epochs=config.get("epochs", 50),
            patience=config.get("patience", 15),
            batch=config.get("batch", 2),
            imgsz=config.get("imgsz", 640),
            device=config.get("device", 0),
            amp=config.get("amp", True),
            workers=config.get("workers", 2),
            cache=config.get("cache", False),
            optimizer=config.get("optimizer", "AdamW"),
            lr0=config.get("lr0", 0.001),
            lrf=config.get("lrf", 0.01),
            momentum=config.get("momentum", 0.937),
            weight_decay=config.get("weight_decay", 0.0005),
            warmup_epochs=config.get("warmup_epochs", 3),
            box=config.get("box", 7.5),
            cls=config.get("cls", 0.5),
            dfl=config.get("dfl", 1.5),
            hsv_h=config.get("hsv_h", 0.01),
            hsv_s=config.get("hsv_s", 0.5),
            hsv_v=config.get("hsv_v", 0.3),
            degrees=config.get("degrees", 3.0),
            translate=config.get("translate", 0.1),
            scale=config.get("scale", 0.2),
            shear=config.get("shear", 2.0),
            flipud=config.get("flipud", 0.0),
            fliplr=config.get("fliplr", 0.0),
            mosaic=config.get("mosaic", 0.5),
            mixup=config.get("mixup", 0.1),
            project=config.get("project", "runs/detect"),
            name=config.get("name", "train"),
            exist_ok=config.get("exist_ok", True),
            save=config.get("save", True),
            save_period=config.get("save_period", 10),
            plots=config.get("plots", True),
            val=config.get("val", True),
            verbose=config.get("verbose", True),
            seed=config.get("seed", 42),
            deterministic=config.get("deterministic", False),
            single_cls=config.get("single_cls", True),
            rect=config.get("rect", False),
            cos_lr=config.get("cos_lr", True),
            close_mosaic=config.get("close_mosaic", 10),
        )

        print("\n" + "=" * 60)
        print("✅ Training completed successfully!")
        print("=" * 60)
        print(f"📁 Results saved to: {results.save_dir}")
        print(f"🏆 Best model: {Path(results.save_dir) / 'weights' / 'best.pt'}")
        print(f"📈 Training plots: {Path(results.save_dir) / 'results.png'}")
        print("\n🎯 Next steps:")
        print(
            f"   1. Evaluate: python scripts/evaluate_model.py --model {Path(results.save_dir) / 'weights' / 'best.pt'}"
        )
        print(
            f"   2. Test: python scripts/test_inference.py --model {Path(results.save_dir) / 'weights' / 'best.pt'}"
        )
        print(
            f"   3. Copy to production: copy {Path(results.save_dir) / 'weights' / 'best.pt'} models/detector/best.pt"
        )
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n⚠️  Training interrupted by user")
        print(
            f"💾 Last checkpoint saved to: {config.get('project', 'runs/detect')}/{config.get('name', 'train')}/weights/last.pt"
        )
        print("\n📝 To resume training:")
        print(
            f"   python scripts/train_detector.py --resume {config.get('project', 'runs/detect')}/{config.get('name', 'train')}/weights/last.pt"
        )
    except Exception as e:
        print(f"\n❌ Training failed with error: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 handwriting detection model")
    parser.add_argument(
        "--config",
        type=str,
        default="configs/rtx3050.yaml",
        help="Path to config file (default: configs/rtx3050.yaml)",
    )
    parser.add_argument(
        "--data", type=str, default=None, help="Path to dataset.yaml (overrides config)"
    )
    parser.add_argument(
        "--epochs", type=int, default=None, help="Number of epochs (overrides config)"
    )
    parser.add_argument(
        "--device", type=str, default=None, help="Device (cuda/cpu/0/1) (overrides config)"
    )
    parser.add_argument("--resume", type=str, default=None, help="Resume training from checkpoint")

    args = parser.parse_args()

    if args.resume:
        print(f"📂 Resuming training from: {args.resume}")
        model = YOLO(args.resume)
        model.train(resume=True)
    else:
        train_model(args.config, args.data, args.epochs, args.device)


if __name__ == "__main__":
    main()
