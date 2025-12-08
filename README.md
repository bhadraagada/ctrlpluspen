# 🖊️ Handwriting Detection & OCR Pipeline

**RTX 3050 Optimized (8GB VRAM) | Local Execution Only**

A complete pipeline for detecting and recognizing handwritten text using YOLOv8 for detection and TrOCR for recognition.

## 📋 Features

- **Detection**: YOLOv8 nano/small for handwriting region detection
- **Recognition**: TrOCR (Microsoft) for handwriting OCR
- **RTX 3050 Optimized**: Tuned for 8GB VRAM with mixed precision
- **End-to-End Pipeline**: Single command from image to recognized text
- **Evaluation**: mAP, CER, WER metrics included

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Create virtual environment with uv
uv venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install PyTorch with CUDA 11.8 FIRST
uv pip install torch==2.1.0 torchvision==0.16.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cu118

# Install project dependencies
uv pip install -e .

# OR install from requirements
uv pip install -r requirements.txt
```

### 2. Verify Installation

```bash
python scripts/check_environment.py
```

### 3. Quick Test (5-10 minutes)

```bash
# Run full pipeline test with synthetic data
python scripts/quick_test.py --samples 100 --epochs 5
```

### 4. Full Training (with real data)

```bash
# First, download IAM dataset (see Dataset section below)
# Then convert to YOLO format
python scripts/convert_to_yolo.py --input ./data/iam --output ./data/yolo_format

# Validate dataset
python scripts/validate_dataset.py --data ./data/yolo_format --visualize

# Train detector
python scripts/train_detector.py --config configs/rtx3050.yaml --epochs 50

# Run prediction
python scripts/predict.py --image ./test_image.jpg --detector models/detector/handwriting_v1/weights/best.pt
```

## 📁 Project Structure

```
handwriting/
├── README.md
├── pyproject.toml
├── requirements.txt
├── configs/
│   ├── rtx3050.yaml      # RTX 3050 optimized config
│   ├── quick_test.yaml   # Quick test config
│   └── data.yaml         # YOLO dataset config
├── scripts/
│   ├── check_environment.py    # Environment verification
│   ├── convert_to_yolo.py      # Dataset conversion
│   ├── validate_dataset.py     # Dataset validation
│   ├── train_detector.py       # YOLO training
│   ├── run_inference.py        # Detection inference
│   ├── run_ocr.py              # OCR processing
│   ├── postprocess.py          # Text ordering/merging
│   ├── evaluate.py             # Metrics calculation
│   ├── predict.py              # Full pipeline
│   ├── visualize.py            # Visualization utilities
│   └── quick_test.py           # Smoke test
├── data/
│   ├── iam/              # IAM dataset (download separately)
│   └── yolo_format/      # Converted dataset
├── models/
│   └── detector/         # Trained models
└── outputs/
    ├── detections/       # Detection results
    ├── crops/            # Cropped regions
    └── visualizations/   # Annotated images
```

## 📊 Dataset

### IAM Handwriting Database (Recommended)

1. **Register** at https://fki.tic.heia-fr.ch/databases/iam-handwriting-database
2. **Download** after approval:
   - `words.tgz` (word images)
   - `lines.tgz` (line images)
   - `ascii.tgz` (annotations)
3. **Extract** to `./data/iam/`
4. **Convert**:
   ```bash
   python scripts/convert_to_yolo.py --input ./data/iam --mode lines
   ```

### Quick Testing (No Download)

```bash
# Create synthetic sample dataset
python scripts/convert_to_yolo.py --create-sample --sample-size 100
```

## ⚙️ RTX 3050 Settings

| Parameter  | Default    | OOM Fallback |
| ---------- | ---------- | ------------ |
| Image Size | 640        | 512          |
| Batch Size | 4          | 2            |
| Workers    | 4          | 2            |
| AMP        | ✅ Enabled | ✅ Enabled   |
| Accumulate | 4          | 8            |

### If you get OOM errors:

```bash
# Try these settings
python scripts/train_detector.py --batch 2 --imgsz 512 --workers 2
```

## 📈 Commands Reference

### Training

```bash
# Quick test training
python scripts/train_detector.py --data ./data/yolo_format/data.yaml --epochs 5 --batch 2

# Full training
python scripts/train_detector.py --config configs/rtx3050.yaml --epochs 50

# Resume training
python scripts/train_detector.py --resume models/detector/handwriting_v1/weights/last.pt
```

### Inference

```bash
# Run detection
python scripts/run_inference.py --model models/detector/best.pt --source ./images/

# Run OCR on crops
python scripts/run_ocr.py --crops ./outputs/crops/ --engine trocr

# Full pipeline
python scripts/predict.py --image document.jpg --detector models/detector/best.pt --output result.json
```

### Evaluation

```bash
# Run evaluation demo
python scripts/evaluate.py --demo

# Evaluate predictions
python scripts/evaluate.py --predictions ./outputs/detections/ --ground-truth ./data/yolo_format/labels/val/
```

### Visualization

```bash
python scripts/visualize.py --json ./outputs/result.json --image ./original.jpg --output annotated.jpg
```

## 🔧 Troubleshooting

### CUDA Not Available

```bash
# Check CUDA status
python -c "import torch; print(torch.cuda.is_available())"

# Reinstall PyTorch with CUDA
uv pip uninstall torch torchvision torchaudio
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Out of Memory (OOM)

1. Reduce batch size: `--batch 2` or `--batch 1`
2. Reduce image size: `--imgsz 512` or `--imgsz 480`
3. Enable AMP (default): `--amp` (already default)
4. Close other GPU applications
5. Monitor with `nvidia-smi`

### Slow Training

- Use SSD for dataset storage
- Reduce `--workers` if CPU bottleneck
- Use `--cache ram` only if 32GB+ RAM

## 📊 Expected Performance

| Metric            | Good     | Acceptable |
| ----------------- | -------- | ---------- |
| Detection mAP@0.5 | 85-95%   | 75-85%     |
| OCR CER           | 5-10%    | 10-20%     |
| OCR WER           | 15-25%   | 25-40%     |
| Inference (640px) | 50-100ms | 100-200ms  |

## 🔗 Resources

- [IAM Dataset](https://fki.tic.heia-fr.ch/databases/iam-handwriting-database)
- [YOLOv8 Documentation](https://docs.ultralytics.com)
- [TrOCR Paper](https://arxiv.org/abs/2109.10282)
- [HuggingFace TrOCR](https://huggingface.co/microsoft/trocr-base-handwritten)

## 📜 License

MIT License - See LICENSE file for details.

---

**⚠️ Important**: This pipeline uses **only real handwritten data** for training and evaluation. Synthetic fonts or printed text should not be used as primary training data.
