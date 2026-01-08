# Testing Your Handwriting Detection Model

Quick guide to test your trained model on your own images!

---

## 🎯 Prerequisites

- Trained model (at `runs/detect/train/weights/best.pt` after training completes)
- Some images with handwriting to test on

---

## 📷 Method 1: Test on Your Own Images (Easiest!)

### Step 1: Prepare Your Images

Put your test images anywhere you want, for example:
- `test_images/note1.jpg`
- `test_images/note2.jpg`
- Or just a single image: `my_handwriting.jpg`

### Step 2: Run the Test Script

**Test a single image:**
```bash
# Activate virtual environment
.venv\Scripts\activate

# Test on one image
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image test_images/note1.jpg
```

**Test all images in a folder:**
```bash
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --images-dir test_images/
```

**Adjust confidence threshold (to detect more/less):**
```bash
# Lower threshold = more detections (but maybe false positives)
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image note.jpg --conf 0.1

# Higher threshold = fewer but more confident detections
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image note.jpg --conf 0.5
```

### Step 3: View Results

Results are automatically saved to `runs/detect/predict/` with bounding boxes drawn on your images!

- **Green boxes** = detected handwriting regions
- **Labels** show confidence scores

---

## 📹 Method 2: Webcam Demo (Real-time!)

Test with your webcam - just show handwritten notes to the camera:

```bash
# Start webcam demo
python scripts/demo_webcam.py --model runs/detect/train/weights/best.pt
```

**Controls:**
- Press `q` - Quit
- Press `s` - Save current frame
- Press `+` - Increase confidence threshold
- Press `-` - Decrease confidence threshold

---

## 🐍 Method 3: Quick Python Script

Create a file `quick_test.py`:

```python
from ultralytics import YOLO
from PIL import Image

# Load model
model = YOLO('runs/detect/train/weights/best.pt')

# Test on image
results = model.predict('your_image.jpg', conf=0.25, save=True)

# Print results
for result in results:
    boxes = result.boxes
    print(f"Found {len(boxes)} handwriting regions!")
    
    for i, box in enumerate(boxes):
        print(f"Region {i+1}: Confidence = {box.conf[0]:.2f}")
```

Run it:
```bash
python quick_test.py
```

---

## 📊 Understanding the Results

### Output Information:

1. **Number of detections** - How many handwriting regions found
2. **Confidence score** - How sure the model is (0.0 to 1.0)
3. **Bounding box** - (x1, y1, x2, y2) coordinates of each detection
4. **Inference time** - How fast the detection ran (milliseconds)

### Example Output:

```
============================================================
📊 Detection Results
============================================================
⏱️  Inference time: 45.23ms
📦 Detections found: 3
============================================================

Detected regions:
#    Confidence   Box (x1, y1, x2, y2)
------------------------------------------------------------
1    0.856        (45, 120, 340, 165)
2    0.723        (50, 180, 380, 230)
3    0.912        (48, 250, 360, 295)

💾 Results saved to: runs/detect/predict
📸 Annotated image: Look in the output folder
```

---

## 💡 Tips for Best Results

### If you get NO detections:

1. **Lower confidence threshold:**
   ```bash
   --conf 0.1  # or even lower
   ```

2. **Check your image:**
   - Is the handwriting clear?
   - Is there enough contrast?
   - Try different lighting

3. **Retrain with more data:**
   - Current model is trained on only 500 synthetic samples
   - For better results, generate 2000+ samples or use IAM dataset

### If you get TOO MANY false detections:

1. **Raise confidence threshold:**
   ```bash
   --conf 0.5  # or higher
   ```

2. **Train longer:**
   - Increase epochs to 50-100
   - Use more training data

---

## 🎨 Example Commands

```bash
# Test on a photo of your notebook
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image notebook_photo.jpg

# Test on all photos in Downloads folder
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --images-dir C:/Users/YourName/Downloads/

# Test with very sensitive detection
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image note.jpg --conf 0.05

# Test without saving results (just see console output)
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image note.jpg --no-save

# Real-time webcam demo
python scripts/demo_webcam.py --model runs/detect/train/weights/best.pt --conf 0.3
```

---

## 📁 Where Are My Results?

After running inference:

- **Annotated images:** `runs/detect/predict/` (with boxes drawn)
- **Original images:** Still in your original location (unchanged)
- **Console output:** Shows detection details

To open results folder quickly:
```bash
explorer runs\detect\predict
```

---

## 🚀 Next Steps

Once you're happy with detection results:

1. **Add OCR (text recognition):**
   - The current model only DETECTS handwriting regions
   - To READ the text, you need to add TrOCR (coming next!)

2. **Train on better data:**
   - IAM dataset gives 85-90% accuracy
   - Generate 2000+ synthetic samples
   - Or annotate your own data

3. **Build an API:**
   - Follow `03_API_DEVELOPMENT.md` (to be created)
   - Deploy to AWS/Azure

---

## ❓ Troubleshooting

**Error: "Model not found"**
```
Solution: Wait for training to complete first!
Check: runs/detect/train/weights/best.pt exists
```

**Error: "Image not found"**
```
Solution: Use full path to image
Example: C:/Users/LENOVO/Desktop/photo.jpg
```

**Error: "CUDA out of memory"**
```
Solution: Model inference uses very little memory
This shouldn't happen during testing
Close training if it's still running
```

**Poor detection quality:**
```
Solution: 
- Model needs more training (increase epochs)
- Use better data (IAM dataset)
- Adjust confidence threshold
- Make sure test images are clear and well-lit
```

---

## 🎓 Full Example Session

```bash
# 1. Activate environment
.venv\Scripts\activate

# 2. Wait for training to finish...
# (Training is still running in background)

# 3. Once training is done, test on an image
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --image my_note.jpg

# 4. Check results
explorer runs\detect\predict

# 5. Try webcam demo
python scripts/demo_webcam.py --model runs/detect/train/weights/best.pt

# 6. Test on multiple images
python scripts/test_inference.py --model runs/detect/train/weights/best.pt --images-dir test_photos/
```

---

**That's it!** You can now test your model on any handwriting image! 🎉

Current model is still training (20 epochs, ~30-45 min total).
Once it's done, the model will be ready at `runs/detect/train/weights/best.pt`.
