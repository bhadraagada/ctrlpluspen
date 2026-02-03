# Python Setup Guide

## Issue: Python 3.13 is Too New

Your system has **Python 3.13.9**, but TensorFlow 2.15 only supports **Python 3.11 or earlier**.

## Solutions

### Option 1: Use TensorFlow 2.20 (Latest - Recommended for Quick Start)

Update the requirements to use the latest TensorFlow that supports Python 3.13:

**For synthesis-api:**
```bash
cd apps/synthesis-api
```

Edit `requirements.txt` and change:
```
tensorflow==2.15.0
tf-keras==2.15.0
tensorflow-probability==0.23.0
```

To:
```
tensorflow>=2.20.0
tensorflow-probability>=0.24.0
```

**For ref2:**
```bash
cd apps/ref2
```

Edit `requirements.txt` and change:
```
tensorflow==2.12.0
tensorflow-probability==0.20.1
```

To:
```
tensorflow>=2.20.0
tensorflow-probability>=0.24.0
```

Then install:
```bash
pip install -r requirements.txt
```

⚠️ **Note:** The model checkpoint was trained with TensorFlow 2.12. Using 2.20 might cause compatibility issues.

### Option 2: Use Conda Environment with Python 3.11 (Recommended for Production)

Create a separate Python 3.11 environment:

```bash
# Create conda environment
conda create -n handwriting-monorepo python=3.11 -y
conda activate handwriting-monorepo

# Install dependencies
cd apps/synthesis-api
pip install -r requirements.txt

cd ../ref2
pip install -r requirements.txt
```

Then always activate this environment before running:
```bash
conda activate handwriting-monorepo
bun dev
```

### Option 3: Run Frontend Only

If you only need the frontend for now:

```bash
bun run dev:frontend
```

This skips the Python apps entirely.

### Option 4: Update Package Scripts to Skip if Not Installed

I can modify the Python package.json files to gracefully skip if dependencies aren't installed.

## Recommended Approach

**For immediate testing:**
```bash
# Just run the frontend
bun run dev:frontend
```

**For full setup:**
1. Install Conda/Miniconda if not already installed
2. Create Python 3.11 environment
3. Install all Python dependencies
4. Run everything with `bun dev`

## Current Status

- ✅ **Frontend**: Ready to run (no Python deps needed)
- ❌ **synthesis-api**: Needs TensorFlow (Python 3.13 incompatible)
- ❌ **ref2**: Needs TensorFlow (Python 3.13 incompatible)

## Quick Commands

```bash
# Frontend only (works now)
bun run dev:frontend

# Check what's installed
pip list | grep tensorflow

# Create conda env (recommended)
conda create -n handwriting python=3.11 -y
conda activate handwriting
cd apps/synthesis-api && pip install -r requirements.txt
cd ../ref2 && pip install -r requirements.txt
```

Would you like me to:
1. Update requirements.txt to use TensorFlow 2.20?
2. Create a graceful skip script for Python apps?
3. Add conda environment setup instructions?
