# Enable GPU Training for TensorFlow 1.15

## Problem

The model is training on CPU instead of GPU because TensorFlow 1.15 requires **CUDA 10.0** and **cuDNN 7.6**, but your system has CUDA 13.1.

## Your System

- **GPU**: NVIDIA GeForce RTX 3050 6GB Laptop GPU ✓
- **Driver**: 591.44 (supports CUDA 13.1) ✓
- **TensorFlow**: 1.15.0-gpu ✓
- **Missing**: CUDA 10.0 toolkit and cuDNN 7.6 ✗

## Solution: Install CUDA 10.0 Toolkit

### Step 1: Download CUDA 10.0

Download from NVIDIA Archive:
https://developer.nvidia.com/cuda-10.0-download-archive

Select:

- Operating System: Windows
- Architecture: x86_64
- Version: 10
- Installer Type: exe (local)

Direct link: https://developer.nvidia.com/compute/cuda/10.0/Prod/local_installers/cuda_10.0.130_411.31_win10

### Step 2: Install CUDA 10.0

1. Run the installer
2. Choose **Custom Installation**
3. **UNCHECK** "Driver Components" (you already have a newer driver)
4. Install to default location: `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v10.0`

### Step 3: Download cuDNN 7.6 for CUDA 10.0

Download from NVIDIA (requires free account):
https://developer.nvidia.com/rdp/cudnn-archive

Select: **cuDNN v7.6.5 for CUDA 10.0**

### Step 4: Extract cuDNN

1. Extract the downloaded zip file
2. Copy files to CUDA 10.0 directory:
   ```
   Copy cudnn64_7.dll to C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v10.0\bin\
   Copy cudnn.h to C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v10.0\include\
   Copy cudnn.lib to C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v10.0\lib\x64\
   ```

### Step 5: Add CUDA 10.0 to PATH

Add these to your System PATH (at the TOP of the list):

```
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v10.0\bin
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v10.0\libnvvp
```

To edit PATH:

1. Right-click "This PC" → Properties
2. Advanced system settings → Environment Variables
3. Under System variables, find "Path"
4. Click Edit → Add the paths above at the TOP

### Step 6: Verify Installation

```powershell
# Restart PowerShell, then run:
conda run -n ref_env python -c "import tensorflow as tf; print('GPU available:', tf.test.is_gpu_available())"
```

You should see: `GPU available: True`

## Alternative: Easier Option Using Conda

Instead of manually installing CUDA, you can use conda to install CUDA 10.0:

```powershell
conda activate ref_env
conda install cudatoolkit=10.0 cudnn=7.6
```

Then test:

```powershell
python -c "import tensorflow as tf; print('GPU available:', tf.test.is_gpu_available())"
```

## After GPU is Enabled

Train with GPU:

```powershell
cd ref
conda run -n ref_env python train_model.py --num_steps 50000
```

Monitor GPU usage in Task Manager - you should see GPU utilization increase to 70-99%!

## Troubleshooting

### "GPU available: False" after installation

1. Restart your computer
2. Verify CUDA 10.0\bin is in PATH
3. Check cudnn64_7.dll is in CUDA\v10.0\bin\

### "Out of memory" errors

Reduce batch size:

```powershell
python train_model.py --batch_size 16 --num_steps 50000
```

### Still using CPU

Force GPU usage by setting environment variable:

```powershell
$env:CUDA_VISIBLE_DEVICES="0"
conda run -n ref_env python train_model.py --num_steps 50000
```

## Expected Performance Improvement

- **CPU Training**: ~2-5 samples/sec
- **GPU Training**: ~20-50 samples/sec (10x faster!)
