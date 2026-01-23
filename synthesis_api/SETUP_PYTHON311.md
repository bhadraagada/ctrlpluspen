# Setup Python 3.11 Environment for Synthesis API

The handwriting synthesis code requires TensorFlow with Keras 2, which only works with Python 3.11 or earlier.

## Quick Setup (Windows)

### 1. Install Python 3.11
Download and install Python 3.11 from: https://www.python.org/downloads/release/python-3118/

### 2. Create Virtual Environment
```bash
cd synthesis_api
python3.11 -m venv .venv311
.venv311\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## Alternative: Use Conda
```bash
conda create -n synthesis python=3.11
conda activate synthesis
cd synthesis_api
pip install -r requirements.txt
python main.py
```

## Troubleshooting

**Error: `RNNCell` is not available**
- Make sure you're using Python 3.11 (not 3.12 or 3.13)
- Verify TensorFlow 2.15.0 is installed: `pip list | grep tensorflow`

**Error: Import errors**
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
