# 02 - Training Guide

Complete guide for training the handwriting detection model on your RTX 3050 GPU.

---

## 🎯 Overview

This guide covers training a YOLOv8 object detection model to detect handwritten text regions in documents. The training is optimized for RTX 3050 (6GB VRAM).

### What You'll Train

- **Model:** YOLOv8-nano (lightweight, fast inference)
- **Task:** Object detection (find handwriting regions)
- **Input:** Document images
- **Output:** Bounding boxes around handwritten text
- **Training Time:** 2-6 hours depending on data size

---

## 📋 Prerequisites

### ✅ Environment Setup Complete

You should have already completed:
- ✅ Python 3.11 virtual environment created
- ✅ PyTorch 2.7.1 with CUDA 11.8 installed
- ✅ All dependencies installed (ultralytics, transformers, etc.)
- ✅ RTX 3050 GPU detected

### Verify Your Setup

```bash
# Activate virtual environment
.venv\Scripts\activate

# Verify CUDA
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}, GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

---

## 📊 Data Preparation

### Option 1: IAM Handwriting Database ⭐ (Recommended - Best Accuracy)

**Best for:** Production deployment, high accuracy (85-90% mAP)

#### Step 1: Register for IAM Access

1. Go to https://fki.tic.heia-fr.ch/databases/iam-handwriting-database
2. Fill out the registration form
3. Wait 24-48 hours for approval email
4. Download credentials

#### Step 2: Download IAM Dataset

```bash
# Once you receive credentials
python scripts/prepare_iam_dataset.py --username YOUR_USERNAME --password YOUR_PASSWORD
```

This will:
- Download IAM handwriting images (~500MB)
- Convert to YOLO format
- Split into train/val/test sets
- Create `data/iam/dataset.yaml`

---

### Option 2: Synthetic Data 🚀 (Quick Start)

**Best for:** Testing, learning, rapid prototyping (70-75% mAP)

```bash
# Generate 2000 synthetic samples (takes 5-10 minutes)
python scripts/generate_synthetic_data.py --num-samples 2000 --output-dir data/synthetic
```

This will:
- Generate handwriting-style text images
- Create random text with various fonts
- Add realistic noise and variations
- Create `data/synthetic/dataset.yaml`

---

### Option 3: Custom Dataset 🎯 (Domain-Specific)

**Best for:** Specific use cases (forms, receipts, notes)

#### Step 1: Collect Images

- Gather 100-200 images of your target documents
- Store in `data/custom/images/`

#### Step 2: Annotate

Use [LabelImg](https://github.com/HumanSignal/labelImg) or [Roboflow](https://roboflow.com):

```bash
# Install labelImg
pip install labelImg

# Launch annotation tool
labelImg data/custom/images
```

Annotation tips:
- Draw tight bounding boxes around each text line
- Use class "handwriting" for all text regions
- Save in YOLO format

#### Step 3: Prepare Dataset

```bash
python scripts/prepare_custom_dataset.py --images data/custom/images --annotations data/custom/labels
```

---

## 🏋️ Training

### Quick Start (Synthetic Data)

```bash
# Generate synthetic data
python scripts/generate_synthetic_data.py --num-samples 2000

# Train with RTX 3050 config
python scripts/train_detector.py --config configs/rtx3050.yaml --data data/synthetic/dataset.yaml --epochs 50
```

### Production Training (IAM Data)

```bash
# Prepare IAM data (after approval)
python scripts/prepare_iam_dataset.py --username YOUR_USER --password YOUR_PASS

# Train with production config
python scripts/train_detector.py --config configs/production.yaml --data data/iam/dataset.yaml --epochs 100
```

---

## ⚙️ Training Configurations

### RTX 3050 Configuration (6GB VRAM)

**File:** `configs/rtx3050.yaml`

```yaml
model: yolov8n.pt        # Nano model (smallest)
epochs: 50               # Quick training
batch: 2                 # Small batch for 6GB VRAM
imgsz: 512              # Reduced image size
device: 0               # GPU 0
amp: true               # Mixed precision (saves memory)
workers: 2              # 2 data loading workers
cache: false            # Don't cache (saves RAM)
accumulate: 8           # Gradient accumulation
```

**Memory Usage:** ~4.5GB VRAM  
**Training Time:** 2-3 hours (50 epochs on 2000 images)  
**Expected mAP:** 70-80%

---

### Production Configuration

**File:** `configs/production.yaml`

```yaml
model: yolov8n.pt
epochs: 100
batch: 4
imgsz: 640
device: 0
amp: true
workers: 4
accumulate: 4
```

**Memory Usage:** ~5.5GB VRAM  
**Training Time:** 5-6 hours (100 epochs on IAM)  
**Expected mAP:** 85-90%

---

## 📈 Monitoring Training

### Watch Training in Real-time

Training will display progress:

```
Epoch    GPU_mem   box_loss   cls_loss   dfl_loss  Instances       Size
  1/50      4.2G      1.234      0.567      1.123         64        512
  2/50      4.3G      1.156      0.523      1.089         64        512
  ...
```

### Metrics to Watch

| Metric | Good | Excellent | What it means |
|--------|------|-----------|---------------|
| **mAP@0.5** | >75% | >85% | Detection accuracy |
| **Precision** | >80% | >90% | % correct detections |
| **Recall** | >75% | >85% | % handwriting found |
| **box_loss** | <0.5 | <0.3 | Bounding box accuracy |

### TensorBoard Visualization

```bash
# View training metrics in browser
tensorboard --logdir runs/detect
```

Open http://localhost:6006

---

## 🧪 Evaluation

### After Training Completes

```bash
# Evaluate on validation set
python scripts/evaluate_model.py --model runs/detect/train/weights/best.pt --data data/iam/dataset.yaml
```

### Test on Sample Images

```bash
# Run inference on test images
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --images data/test_samples/
```

---

## 💾 Model Export

### Save Best Model

Training automatically saves:
- `runs/detect/train/weights/best.pt` - Best checkpoint
- `runs/detect/train/weights/last.pt` - Latest checkpoint

### Copy to Production Location

```bash
# Copy best model
mkdir -p models/detector
copy runs\detect\train\weights\best.pt models\detector\best.pt
```

### Optional: Export to ONNX (Faster Inference)

```bash
python scripts/export_model.py --model models/detector/best.pt --format onnx
```

---

## 🐛 Troubleshooting

### Out of Memory (OOM)

**Error:** `CUDA out of memory`

**Solutions:**
```yaml
# Reduce these values in config:
batch: 1              # Smaller batch
imgsz: 416           # Smaller images
accumulate: 16       # More accumulation
cache: false         # Don't cache
```

### Low Accuracy (<70% mAP)

**Possible causes:**
1. **Insufficient data** - Generate more synthetic or get IAM
2. **Wrong data format** - Check YOLO labels are correct
3. **Too few epochs** - Train longer (100+ epochs)
4. **Learning rate** - Try `lr0: 0.0005`

### Training Too Slow

**Solutions:**
1. Reduce `imgsz` to 416 or 512
2. Use `cache: true` if you have enough RAM (16GB+)
3. Reduce `workers` to 2
4. Enable `amp: true` (already enabled)

### Model Not Learning (Loss Not Decreasing)

**Solutions:**
1. Check data - verify labels are correct
2. Increase learning rate: `lr0: 0.01`
3. Reduce `weight_decay: 0.0001`
4. Start with pretrained YOLOv8: `model: yolov8n.pt`

---

## 📊 Expected Results

### Training Metrics by Dataset

| Dataset | Training Time | mAP@0.5 | Precision | Recall | Use Case |
|---------|---------------|---------|-----------|--------|----------|
| **Synthetic (2k)** | 2-3 hours | 70-75% | 75-80% | 70-75% | Testing, PoC |
| **IAM (5k lines)** | 5-6 hours | 85-90% | 88-92% | 82-87% | Production |
| **Custom (200)** | 1-2 hours | 75-85% | 80-88% | 75-82% | Specific domain |

### Sample Inference Speed

- **Detection:** 20-30ms per image (RTX 3050)
- **OCR per region:** 80-120ms (TrOCR)
- **Full page (5 regions):** ~500ms total

---

## 🚀 Next Steps

After training completes:

1. **✅ Evaluate** - Test model on validation set
2. **✅ Test inference** - Try on real images
3. **✅ Copy model** - Move `best.pt` to `models/detector/`
4. **📝 API Development** - Proceed to `03_API_DEVELOPMENT.md`
5. **☁️ Deployment** - Follow `04_AWS_DEPLOYMENT.md`

---

## 📝 Training Commands Cheat Sheet

```bash
# Quick synthetic training (2-3 hours)
python scripts/generate_synthetic_data.py --num-samples 2000
python scripts/train_detector.py --config configs/rtx3050.yaml

# Production IAM training (5-6 hours)
python scripts/prepare_iam_dataset.py --username USER --password PASS
python scripts/train_detector.py --config configs/production.yaml

# Resume training from checkpoint
python scripts/train_detector.py --resume runs/detect/train/weights/last.pt

# Evaluate model
python scripts/evaluate_model.py --model models/detector/best.pt

# Test inference
python scripts/test_inference.py --model models/detector/best.pt --images test/

# Export to ONNX
python scripts/export_model.py --model models/detector/best.pt --format onnx
```

---

## 🎓 Understanding the Training Process

### What Happens During Training

1. **Initialization**
   - Load pretrained YOLOv8-nano weights
   - Configure for single class (handwriting)
   - Set up optimizer (AdamW)

2. **Training Loop** (each epoch):
   - Load batch of images
   - Forward pass (predictions)
   - Calculate loss (box, class, DFL)
   - Backward pass (gradients)
   - Update weights
   - Validate on val set

3. **Validation**
   - Run on validation set every epoch
   - Calculate mAP, precision, recall
   - Save best checkpoint if improved

4. **Completion**
   - Save final weights
   - Generate training plots
   - Export metrics

### Loss Components

- **box_loss:** Bounding box accuracy
- **cls_loss:** Classification accuracy
- **dfl_loss:** Distribution focal loss (box quality)

Lower is better for all losses.

---

## 💡 Tips for Better Results

### Data Quality

1. **Diverse handwriting** - Multiple writers, styles
2. **Clear images** - Good lighting, no blur
3. **Tight boxes** - Accurate bounding boxes
4. **Balanced data** - Similar number of samples per style

### Training Hyperparameters

1. **Start with defaults** - Use provided configs
2. **Increase epochs** - More is usually better (up to 200)
3. **Patience** - Stop if no improvement for 15 epochs
4. **Augmentation** - Helps generalization (already configured)

### Hardware Tips

1. **Close other apps** - Free up VRAM
2. **Monitor temperature** - Keep GPU cool
3. **Use power mode** - High performance mode
4. **Clean GPU drivers** - Update to latest NVIDIA drivers

---

**Ready to train?** Run the commands above and monitor the progress!

Once training completes, proceed to testing and deployment guides.

**Training Time Estimates:**
- Synthetic (50 epochs): 2-3 hours ⚡
- IAM (100 epochs): 5-6 hours 🔥
- Custom (50 epochs): 1-2 hours ⚡

Good luck! 🚀
