"""
Image preprocessing utilities
"""

from PIL import Image, ImageEnhance, ImageFilter
from typing import Optional, Tuple


def preprocess_image(
    image: Image.Image, resize: Optional[Tuple[int, int]] = None, enhance_contrast: bool = True
) -> Image.Image:
    """Preprocess image for better OCR"""
    if image.mode != "RGB":
        image = image.convert("RGB")

    if resize:
        image = image.resize(resize, Image.Resampling.LANCZOS)

    if enhance_contrast:
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)

    return image
