"""
TrOCR-based Handwriting OCR Service
Uses Microsoft's TrOCR-large model for state-of-the-art handwriting recognition
Includes: GPU support, advanced preprocessing, line segmentation, spell checking, EasyOCR fallback
"""

import io
import base64
import os
from typing import Optional, List, Tuple
from pathlib import Path

# Suppress OpenMP warning for EasyOCR
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# Lazy imports to avoid loading heavy models on import
_processor = None
_model = None
_device = None
_easyocr_reader = None
_spell_checker = None


def get_device():
    """Get the best available device (GPU preferred, CPU fallback)"""
    import torch

    if torch.cuda.is_available():
        device = "cuda"
        gpu_name = torch.cuda.get_device_name(0)
        gpu_mem = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"[TrOCR] Using GPU: {gpu_name} ({gpu_mem:.1f} GB)")
        return device
    else:
        print("[TrOCR] CUDA not available, using CPU")
        return "cpu"


def get_trocr_model():
    """Lazy load TrOCR LARGE model for better accuracy"""
    global _processor, _model, _device

    if _model is None:
        import torch
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
        import warnings

        warnings.filterwarnings("ignore", message="Some weights")

        # Use the LARGE handwritten model for better accuracy
        model_name = "microsoft/trocr-large-handwritten"

        print(f"[TrOCR] Loading model: {model_name}")
        _processor = TrOCRProcessor.from_pretrained(model_name)
        _model = VisionEncoderDecoderModel.from_pretrained(model_name)

        _device = get_device()
        _model = _model.to(_device)
        _model.eval()

        if _device == "cuda":
            try:
                _model = _model.half()
                print("[TrOCR] Enabled FP16 for faster GPU inference")
            except Exception as e:
                print(f"[TrOCR] Could not enable FP16: {e}")

        print(f"[TrOCR] Model loaded successfully on {_device.upper()}")

    return _processor, _model, _device


def get_easyocr_reader():
    """Lazy load EasyOCR as fallback"""
    global _easyocr_reader

    if _easyocr_reader is None:
        try:
            import easyocr

            print("[OCR] Loading EasyOCR as fallback...")
            _easyocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            print("[OCR] EasyOCR loaded successfully")
        except Exception as e:
            print(f"[OCR] EasyOCR not available: {e}")
            _easyocr_reader = False  # Mark as unavailable

    return _easyocr_reader if _easyocr_reader else None


def get_spell_checker():
    """Lazy load spell checker"""
    global _spell_checker

    if _spell_checker is None:
        try:
            from spellchecker import SpellChecker

            _spell_checker = SpellChecker()
            print("[OCR] Spell checker loaded")
        except ImportError:
            _spell_checker = False

    return _spell_checker if _spell_checker else None


def deskew_image(image):
    """Detect and correct image skew"""
    import numpy as np
    from PIL import Image

    try:
        import cv2

        # Convert to numpy
        img_array = np.array(image.convert("L"))

        # Detect edges
        edges = cv2.Canny(img_array, 50, 150, apertureSize=3)

        # Detect lines using Hough transform
        lines = cv2.HoughLinesP(
            edges,
            1,
            np.pi / 180,
            threshold=100,
            minLineLength=img_array.shape[1] // 4,
            maxLineGap=10,
        )

        if lines is not None and len(lines) > 0:
            # Calculate average angle
            angles = []
            for line in lines:
                x1, y1, x2, y2 = line[0]
                if x2 - x1 != 0:
                    angle = np.arctan((y2 - y1) / (x2 - x1)) * 180 / np.pi
                    if abs(angle) < 45:  # Only consider near-horizontal lines
                        angles.append(angle)

            if angles:
                avg_angle = np.median(angles)
                if abs(avg_angle) > 0.5:  # Only correct if skew > 0.5 degrees
                    print(f"[TrOCR] Deskewing by {avg_angle:.1f}°")
                    return image.rotate(-avg_angle, expand=True, fillcolor="white")
    except Exception as e:
        pass  # Silently fail if deskew doesn't work

    return image


def denoise_image(image):
    """Apply denoising to image"""
    import numpy as np
    from PIL import Image, ImageFilter

    try:
        import cv2

        img_array = np.array(image)

        # Convert to grayscale if needed
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # Apply Non-local Means Denoising
        denoised = cv2.fastNlMeansDenoising(
            gray, None, h=10, templateWindowSize=7, searchWindowSize=21
        )

        return Image.fromarray(denoised)
    except:
        # Fallback to PIL median filter
        return image.convert("L").filter(ImageFilter.MedianFilter(size=3))


def sharpen_image(image):
    """Apply sharpening to enhance text edges"""
    from PIL import Image, ImageEnhance, ImageFilter

    # Convert to grayscale if needed
    if image.mode != "L":
        image = image.convert("L")

    # Apply unsharp mask (sharpen)
    sharpened = image.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))

    return sharpened


def preprocess_for_ocr(image, advanced: bool = True):
    """
    Advanced preprocessing pipeline for OCR.
    """
    from PIL import Image, ImageOps, ImageEnhance

    # Convert to RGB if needed
    if image.mode != "RGB":
        image = image.convert("RGB")

    if advanced:
        # Step 1: Deskew
        image = deskew_image(image)

        # Step 2: Denoise
        gray = denoise_image(image)

        # Step 3: Sharpen
        gray = sharpen_image(gray)
    else:
        gray = image.convert("L")

    # Step 4: Auto-contrast
    gray = ImageOps.autocontrast(gray, cutoff=2)

    # Step 5: Contrast enhancement
    enhancer = ImageEnhance.Contrast(gray)
    gray = enhancer.enhance(1.3)

    # Convert back to RGB (TrOCR expects RGB)
    return gray.convert("RGB")


def segment_lines(image) -> List:
    """
    Advanced line segmentation with adaptive parameters.
    Uses horizontal projection profile with valley detection for dense text.
    """
    from PIL import Image, ImageOps, ImageEnhance
    import numpy as np
    from scipy.signal import find_peaks
    from scipy.ndimage import gaussian_filter1d

    # Convert to grayscale and enhance contrast for better detection
    gray = image.convert("L")
    gray = ImageOps.autocontrast(gray, cutoff=2)
    enhancer = ImageEnhance.Contrast(gray)
    gray = enhancer.enhance(1.5)
    img_array = np.array(gray)

    # Calculate adaptive threshold
    mean_val = np.mean(img_array)
    std_val = np.std(img_array)
    threshold = mean_val - 0.4 * std_val  # Slightly more aggressive
    threshold = max(50, min(200, threshold))

    print(f"[TrOCR] Image: {image.size}, mean={mean_val:.0f}, threshold={threshold:.0f}")

    # Binarize
    binary = img_array < threshold

    # Calculate horizontal projection
    h_proj = np.sum(binary, axis=1).astype(float)

    if h_proj.max() == 0:
        print("[TrOCR] No text detected, using whole image")
        return [image]

    # Smooth the projection with adaptive sigma
    sigma = max(2, min(5, image.height // 80))
    h_proj_smooth = gaussian_filter1d(h_proj, sigma=sigma)
    h_proj_norm = h_proj_smooth / h_proj_smooth.max()

    # METHOD 1: Try to find clear gaps
    gap_threshold = 0.08  # More sensitive
    is_text = h_proj_norm > gap_threshold

    regions = []
    in_region = False
    region_start = 0
    min_height = max(8, image.height // 25)  # Smaller minimum for dense text

    for i, is_txt in enumerate(is_text):
        if is_txt and not in_region:
            in_region = True
            region_start = i
        elif not is_txt and in_region:
            in_region = False
            if i - region_start >= min_height:
                regions.append((region_start, i))

    if in_region and len(is_text) - region_start >= min_height:
        regions.append((region_start, len(is_text)))

    # If we found multiple clear regions, use them
    if len(regions) > 1:
        print(f"[TrOCR] Found {len(regions)} lines (gap method)")
    else:
        # METHOD 2: Valley detection for dense text
        print("[TrOCR] Using valley detection...")

        inverted = h_proj_smooth.max() - h_proj_smooth

        # Adaptive parameters based on image height
        min_distance = max(10, image.height // 30)
        height_threshold = inverted.max() * 0.20  # More sensitive

        valleys, _ = find_peaks(inverted, height=height_threshold, distance=min_distance)

        if len(valleys) > 0:
            regions = []
            prev_end = 0

            for valley in valleys:
                if valley - prev_end >= min_height:
                    regions.append((prev_end, valley))
                prev_end = valley

            if len(h_proj) - prev_end >= min_height:
                regions.append((prev_end, len(h_proj)))

            print(f"[TrOCR] Found {len(regions)} lines (valley method)")
        else:
            print("[TrOCR] No line breaks found, using whole image")
            return [image]

    if not regions:
        return [image]

    # Crop lines with padding
    padding = max(2, image.height // 80)
    line_images = []

    for i, (start, end) in enumerate(regions):
        top = max(0, start - padding)
        bottom = min(image.height, end + padding)
        line_img = image.crop((0, top, image.width, bottom))
        print(f"[TrOCR]   Line {i + 1}: y={start}-{end} ({end - start}px)")
        line_images.append(line_img)

    return line_images


def correct_spelling(text: str) -> str:
    """Apply spell checking to recognized text"""
    spell = get_spell_checker()
    if not spell:
        return text

    words = text.split()
    corrected = []

    for word in words:
        # Keep punctuation
        prefix = ""
        suffix = ""
        clean_word = word

        # Extract leading punctuation
        while clean_word and not clean_word[0].isalnum():
            prefix += clean_word[0]
            clean_word = clean_word[1:]

        # Extract trailing punctuation
        while clean_word and not clean_word[-1].isalnum():
            suffix = clean_word[-1] + suffix
            clean_word = clean_word[:-1]

        if clean_word and clean_word.lower() not in spell:
            correction = spell.correction(clean_word.lower())
            if correction and correction != clean_word.lower():
                # Preserve original case
                if clean_word.isupper():
                    correction = correction.upper()
                elif clean_word[0].isupper():
                    correction = correction.capitalize()
                clean_word = correction

        corrected.append(prefix + clean_word + suffix)

    return " ".join(corrected)


def recognize_with_easyocr(image) -> Tuple[str, float]:
    """Use EasyOCR as fallback"""
    import numpy as np

    reader = get_easyocr_reader()
    if not reader:
        return "", 0.0

    try:
        img_array = np.array(image)
        results = reader.readtext(img_array)

        if results:
            texts = [r[1] for r in results]
            confidences = [r[2] for r in results]
            return " ".join(texts), sum(confidences) / len(confidences)
    except Exception as e:
        print(f"[EasyOCR] Error: {e}")

    return "", 0.0


def recognize_text(image, preprocess: bool = True, use_fallback: bool = True) -> Tuple[str, float]:
    """
    Recognize text from a single line image.
    Uses TrOCR with EasyOCR fallback for low confidence.
    """
    import torch

    processor, model, device = get_trocr_model()

    if preprocess:
        processed_image = preprocess_for_ocr(image, advanced=True)
    else:
        processed_image = image
        if processed_image.mode != "RGB":
            processed_image = processed_image.convert("RGB")

    # TrOCR inference
    pixel_values = processor(images=processed_image, return_tensors="pt").pixel_values

    if device == "cuda":
        pixel_values = pixel_values.half()
    pixel_values = pixel_values.to(device)

    with torch.no_grad():
        outputs = model.generate(
            pixel_values,
            max_length=150,  # Increased for longer lines
            num_beams=5,  # More beams for better accuracy
            return_dict_in_generate=True,
            output_scores=True,
        )

    generated_ids = outputs.sequences
    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

    if hasattr(outputs, "sequences_scores") and outputs.sequences_scores is not None:
        confidence = torch.exp(outputs.sequences_scores).item()
    else:
        confidence = 0.9

    text = generated_text.strip()
    confidence = min(confidence, 1.0)

    # Fallback to EasyOCR if confidence is low
    if use_fallback and confidence < 0.4 and text:
        print(f"[TrOCR] Low confidence ({confidence:.2f}), trying EasyOCR...")
        easy_text, easy_conf = recognize_with_easyocr(image)
        if easy_conf > confidence and easy_text:
            print(f"[EasyOCR] Better result: '{easy_text}' ({easy_conf:.2f})")
            return easy_text, easy_conf

    return text, confidence


def recognize_document(
    image, preprocess: bool = True, segment_lines_enabled: bool = True, spell_check: bool = True
) -> dict:
    """
    Recognize all text from a document image.
    Full pipeline with all enhancements.
    """
    import time

    start_time = time.time()

    # Segment lines on original image
    if segment_lines_enabled:
        line_images = segment_lines(image)
    else:
        line_images = [image]

    # Recognize each line
    lines = []
    total_confidence = 0.0

    for i, line_img in enumerate(line_images):
        text, confidence = recognize_text(line_img, preprocess=preprocess)

        # Apply spell checking
        if spell_check and text:
            original_text = text
            text = correct_spelling(text)
            if text != original_text:
                print(f"[Spell] '{original_text}' -> '{text}'")

        print(f"[TrOCR]   -> '{text}' (conf={confidence:.2f})")

        if text:
            lines.append(
                {
                    "line_number": i + 1,
                    "text": text,
                    "confidence": confidence,
                }
            )
            total_confidence += confidence

    # Combine results
    full_text = "\n".join(line["text"] for line in lines)
    avg_confidence = total_confidence / len(lines) if lines else 0.0
    processing_time = (time.time() - start_time) * 1000

    return {
        "text": full_text,
        "lines": lines,
        "num_lines": len(lines),
        "avg_confidence": avg_confidence,
        "processing_time_ms": processing_time,
    }


def recognize_from_base64(
    image_base64: str, preprocess: bool = True, segment_lines_enabled: bool = True
) -> dict:
    """Recognize text from a base64-encoded image."""
    from PIL import Image

    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        if image.mode != "RGB":
            image = image.convert("RGB")

    except Exception as e:
        raise ValueError(f"Failed to decode image: {str(e)}")

    return recognize_document(image, preprocess, segment_lines_enabled)


def check_trocr_available() -> dict:
    """Check if TrOCR is available and return status"""
    try:
        import torch

        has_torch = True
        cuda_available = torch.cuda.is_available()
    except ImportError:
        has_torch = False
        cuda_available = False

    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel

        has_transformers = True
    except ImportError:
        has_transformers = False

    return {
        "pytorch_installed": has_torch,
        "transformers_installed": has_transformers,
        "cuda_available": cuda_available,
        "ready": has_torch and has_transformers,
    }


if __name__ == "__main__":
    status = check_trocr_available()
    print("TrOCR Status:", status)

    if status["ready"]:
        from PIL import Image

        # Test with real image if available
        test_path = Path("../test.jpeg")
        if test_path.exists():
            print(f"\nTesting with {test_path}...")
            img = Image.open(test_path)
            result = recognize_document(img)
            print(f"\n=== RESULTS ===")
            print(f"Lines: {result['num_lines']}")
            print(f"Confidence: {result['avg_confidence']:.1%}")
            print(f"Time: {result['processing_time_ms']:.0f}ms")
            print(f"\nText:\n{result['text']}")
