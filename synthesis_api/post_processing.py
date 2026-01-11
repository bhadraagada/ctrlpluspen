"""
Post-processing module for realistic handwriting rendering.

Transforms clean SVG handwriting into realistic pen-on-paper images by simulating:
- Ink behavior (pressure variation, feathering, edge roughness)
- Paper texture (fibers, grain)
- Scan/photo artifacts (noise, uneven lighting, blur)
"""

import io
import base64
import random
from typing import Tuple, Optional, Literal
from dataclasses import dataclass
from enum import Enum

import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance, ImageOps
import cv2

# Try to import cairosvg for SVG rendering, fall back to alternative if not available
try:
    import cairosvg

    HAS_CAIROSVG = True
except ImportError:
    HAS_CAIROSVG = False
    print("Warning: cairosvg not available, using PIL-based SVG rendering")


class PaperType(str, Enum):
    WHITE = "white"
    CREAM = "cream"
    AGED = "aged"
    LINED = "lined"
    GRID = "grid"
    RECYCLED = "recycled"


class InkType(str, Enum):
    BALLPOINT = "ballpoint"
    GEL = "gel"
    FOUNTAIN = "fountain"
    MARKER = "marker"
    PENCIL = "pencil"


@dataclass
class RealisticSettings:
    """Settings for realistic rendering"""

    paper_type: PaperType = PaperType.WHITE
    ink_type: InkType = InkType.BALLPOINT
    wear_level: float = 0.3  # 0-1: pristine to heavily worn

    # Fine-tuning (usually derived from ink_type)
    edge_roughness: float = 0.3  # 0-1 (reduced for sharper edges)
    feathering: float = 0.15  # 0-1 (reduced - less ink spread)
    pressure_variation: float = 0.4  # 0-1
    paper_show_through: float = 0.1  # 0-1: how much paper shows through ink

    # Scan artifacts
    noise_amount: float = 0.015  # 0-1 (subtle noise)
    blur_amount: float = 0.0  # 0-1 pixels (disabled by default - keep sharp!)
    lighting_variation: float = 0.08  # 0-1

    @classmethod
    def from_ink_type(
        cls, ink_type: InkType, paper_type: PaperType = PaperType.WHITE, wear_level: float = 0.3
    ) -> "RealisticSettings":
        """Create settings optimized for specific ink type"""
        settings = cls(paper_type=paper_type, ink_type=ink_type, wear_level=wear_level)

        if ink_type == InkType.BALLPOINT:
            settings.edge_roughness = 0.25  # Subtle edge variation
            settings.feathering = 0.1  # Minimal feathering for ballpoint
            settings.pressure_variation = 0.4
            settings.paper_show_through = 0.15
        elif ink_type == InkType.GEL:
            settings.edge_roughness = 0.2
            settings.feathering = 0.2  # Slightly more spread
            settings.pressure_variation = 0.25
            settings.paper_show_through = 0.08
        elif ink_type == InkType.FOUNTAIN:
            settings.edge_roughness = 0.35  # More variation
            settings.feathering = 0.3  # More ink spread
            settings.pressure_variation = 0.55
            settings.paper_show_through = 0.2
        elif ink_type == InkType.MARKER:
            settings.edge_roughness = 0.15
            settings.feathering = 0.25
            settings.pressure_variation = 0.15
            settings.paper_show_through = 0.03
        elif ink_type == InkType.PENCIL:
            settings.edge_roughness = 0.4
            settings.feathering = 0.05  # Pencil has very little feathering
            settings.pressure_variation = 0.5
            settings.paper_show_through = 0.3

        # Apply wear level adjustments - NO BLUR by default!
        settings.noise_amount = 0.008 + wear_level * 0.02  # Very subtle noise
        settings.blur_amount = 0.0  # Keep sharp! Only enable for "old photocopy" effect
        settings.lighting_variation = 0.03 + wear_level * 0.1

        return settings


def generate_perlin_noise(
    width: int, height: int, scale: float = 50.0, octaves: int = 4, seed: Optional[int] = None
) -> np.ndarray:
    """Generate Perlin-like noise using multiple octaves of simplex noise"""
    if seed is not None:
        np.random.seed(seed)

    noise = np.zeros((height, width), dtype=np.float32)

    for octave in range(octaves):
        freq = 2**octave
        amplitude = 1 / freq

        # Generate random gradients at grid points
        grid_h = max(2, int(height / (scale / freq)))
        grid_w = max(2, int(width / (scale / freq)))

        # Random values at grid points
        grid = np.random.rand(grid_h, grid_w).astype(np.float32)

        # Resize to full image size with smooth interpolation
        resized = cv2.resize(grid, (width, height), interpolation=cv2.INTER_CUBIC)

        noise += resized * amplitude

    # Normalize to 0-1
    noise = (noise - noise.min()) / (noise.max() - noise.min() + 1e-8)
    return noise


def generate_paper_texture(
    width: int, height: int, paper_type: PaperType, seed: Optional[int] = None
) -> Image.Image:
    """Generate a paper texture image"""
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)

    # Base color based on paper type
    if paper_type == PaperType.WHITE:
        base_color = (252, 252, 250)  # Slightly off-white
        grain_intensity = 0.03
    elif paper_type == PaperType.CREAM:
        base_color = (255, 253, 240)  # Cream/ivory
        grain_intensity = 0.04
    elif paper_type == PaperType.AGED:
        base_color = (245, 235, 210)  # Aged/yellowed
        grain_intensity = 0.08
    elif paper_type == PaperType.RECYCLED:
        base_color = (240, 238, 230)  # Grayish recycled
        grain_intensity = 0.06
    else:
        base_color = (252, 252, 250)
        grain_intensity = 0.03

    # Create base image
    img = Image.new("RGB", (width, height), base_color)
    img_array = np.array(img, dtype=np.float32)

    # Add fiber texture (fine grain)
    fiber_noise = generate_perlin_noise(width, height, scale=20.0, octaves=3, seed=seed)
    fiber_noise = (fiber_noise - 0.5) * grain_intensity * 255

    # Add larger paper variation
    large_noise = generate_perlin_noise(
        width, height, scale=100.0, octaves=2, seed=seed + 1 if seed else None
    )
    large_noise = (large_noise - 0.5) * grain_intensity * 0.5 * 255

    # Apply noise to all channels
    for c in range(3):
        img_array[:, :, c] += fiber_noise + large_noise

    # Add some random specs (paper imperfections)
    if paper_type in [PaperType.AGED, PaperType.RECYCLED]:
        specs = np.random.rand(height, width) > 0.998
        spec_darkness = np.random.randint(20, 60, (height, width))
        for c in range(3):
            img_array[:, :, c] -= specs * spec_darkness

    # Clip and convert back
    img_array = np.clip(img_array, 0, 255).astype(np.uint8)
    paper = Image.fromarray(img_array)

    # Add lines or grid if needed
    if paper_type == PaperType.LINED:
        draw = ImageDraw.Draw(paper)
        line_spacing = 30
        line_color = (200, 210, 230)  # Light blue
        for y in range(line_spacing * 2, height, line_spacing):
            draw.line([(0, y), (width, y)], fill=line_color, width=1)

    elif paper_type == PaperType.GRID:
        draw = ImageDraw.Draw(paper)
        grid_spacing = 25
        grid_color = (210, 220, 235)  # Very light blue
        for y in range(0, height, grid_spacing):
            draw.line([(0, y), (width, y)], fill=grid_color, width=1)
        for x in range(0, width, grid_spacing):
            draw.line([(x, 0), (x, height)], fill=grid_color, width=1)

    return paper


def svg_to_alpha_mask(
    svg_content: str, width: int = None, height: int = None
) -> Tuple[Image.Image, int, int]:
    """
    Convert SVG to an alpha mask (grayscale image where strokes are dark).
    Returns (mask_image, actual_width, actual_height)
    """
    if HAS_CAIROSVG:
        # Render SVG to PNG using cairosvg
        png_data = cairosvg.svg2png(bytestring=svg_content.encode("utf-8"))
        img = Image.open(io.BytesIO(png_data)).convert("RGBA")
    else:
        # Fallback: try to parse SVG and render with PIL (limited)
        # For now, we'll create a placeholder - in production, cairosvg should be installed
        raise ImportError(
            "cairosvg is required for SVG rendering. Install with: pip install cairosvg"
        )

    actual_width, actual_height = img.size

    # Extract the alpha/darkness as mask
    # Convert RGBA to grayscale where dark strokes = high values
    r, g, b, a = img.split()

    # Combine RGB darkness with alpha
    rgb_array = np.array(img.convert("RGB"), dtype=np.float32)
    luminance = 0.299 * rgb_array[:, :, 0] + 0.587 * rgb_array[:, :, 1] + 0.114 * rgb_array[:, :, 2]

    # Invert so strokes are white (high values)
    darkness = 255 - luminance

    # Combine with alpha
    alpha_array = np.array(a, dtype=np.float32)
    mask = (darkness * alpha_array / 255).astype(np.uint8)

    mask_img = Image.fromarray(mask, mode="L")

    return mask_img, actual_width, actual_height


def apply_edge_roughness(
    mask: np.ndarray, intensity: float = 0.3, seed: Optional[int] = None
) -> np.ndarray:
    """Apply subtle edge roughness to break perfect vector edges - keep it minimal"""
    if intensity <= 0:
        return mask

    if seed is not None:
        np.random.seed(seed)

    height, width = mask.shape

    # Create displacement maps - use smaller scale for finer details
    scale = 15 + intensity * 10  # Reduced scale
    dx = generate_perlin_noise(width, height, scale=scale, octaves=2, seed=seed)
    dy = generate_perlin_noise(
        width, height, scale=scale, octaves=2, seed=seed + 100 if seed else None
    )

    # Convert to displacement - very subtle (max 1 pixel displacement)
    max_displacement = intensity * 1.0  # Reduced from 2.0
    dx = (dx - 0.5) * 2 * max_displacement
    dy = (dy - 0.5) * 2 * max_displacement

    # Create coordinate grids
    y_coords, x_coords = np.meshgrid(np.arange(height), np.arange(width), indexing="ij")

    # Apply displacement
    new_x = np.clip(x_coords + dx, 0, width - 1).astype(np.float32)
    new_y = np.clip(y_coords + dy, 0, height - 1).astype(np.float32)

    # Remap using OpenCV - use INTER_NEAREST for sharper result
    roughened = cv2.remap(mask.astype(np.float32), new_x, new_y, interpolation=cv2.INTER_LINEAR)

    return roughened.astype(np.uint8)


def apply_feathering(mask: np.ndarray, intensity: float = 0.15) -> np.ndarray:
    """Apply subtle feathering/ink spread - very light to keep strokes sharp"""
    if intensity <= 0:
        return mask

    # Very subtle dilation - only 1-2 pixels max
    kernel_size = max(3, min(5, int(intensity * 3) | 1))  # Max 5px kernel
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))

    # Light dilation
    dilated = cv2.dilate(mask, kernel, iterations=1)

    # Very subtle blur on the edges only (not the core)
    blur_size = 3  # Fixed small blur
    blurred = cv2.GaussianBlur(dilated, (blur_size, blur_size), 0)

    # Blend: keep original core strong, only add subtle soft edges
    # Use a higher weight for the original to maintain sharpness
    core_weight = 0.85
    edge_weight = 0.15 * intensity

    result = np.maximum(mask, (mask * core_weight + blurred * edge_weight).astype(np.uint8))

    return result


def apply_pressure_variation(
    mask: np.ndarray, intensity: float = 0.4, seed: Optional[int] = None
) -> np.ndarray:
    """Modulate darkness along strokes to simulate pressure changes"""
    if intensity <= 0:
        return mask

    height, width = mask.shape

    # Generate low-frequency noise for pressure variation
    pressure_noise = generate_perlin_noise(width, height, scale=80.0, octaves=2, seed=seed)

    # Map to multiplier (0.7 to 1.0 range based on intensity)
    min_mult = 1.0 - intensity * 0.4
    multiplier = min_mult + pressure_noise * (1.0 - min_mult)

    # Apply only where there's ink
    result = (mask.astype(np.float32) * multiplier).astype(np.uint8)

    return result


def apply_paper_show_through(
    ink_mask: np.ndarray, paper: np.ndarray, intensity: float = 0.15
) -> np.ndarray:
    """Make paper texture show through the ink slightly"""
    if intensity <= 0:
        return ink_mask

    # Convert paper to grayscale variation
    if len(paper.shape) == 3:
        paper_gray = cv2.cvtColor(paper, cv2.COLOR_RGB2GRAY)
    else:
        paper_gray = paper

    # Normalize paper texture
    paper_var = (paper_gray.astype(np.float32) - 128) / 128  # -1 to 1

    # Apply paper texture to ink areas
    ink_float = ink_mask.astype(np.float32)

    # Where there's ink, modulate by paper texture
    ink_amount = ink_float / 255  # 0 to 1
    paper_effect = paper_var * intensity * 50 * ink_amount

    result = ink_float - paper_effect
    result = np.clip(result, 0, 255).astype(np.uint8)

    return result


def apply_scan_artifacts(
    image: np.ndarray, settings: RealisticSettings, seed: Optional[int] = None
) -> np.ndarray:
    """Apply scan/photo artifacts: noise, uneven lighting, slight blur"""
    if seed is not None:
        np.random.seed(seed)

    height, width = image.shape[:2]
    result = image.astype(np.float32)

    # 1. Uneven lighting (vignette + gradient)
    if settings.lighting_variation > 0:
        # Create radial gradient (vignette)
        y, x = np.ogrid[:height, :width]
        cx, cy = width / 2, height / 2
        distance = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        max_dist = np.sqrt(cx**2 + cy**2)
        vignette = 1 - (distance / max_dist) * settings.lighting_variation * 0.3

        # Add random gradient for uneven scanner lighting
        gradient_noise = generate_perlin_noise(width, height, scale=200, octaves=1, seed=seed)
        gradient = 1 - (gradient_noise - 0.5) * settings.lighting_variation * 0.2

        lighting = vignette * gradient

        if len(result.shape) == 3:
            lighting = lighting[:, :, np.newaxis]

        result = result * lighting

    # 2. Gaussian noise (sensor noise)
    if settings.noise_amount > 0:
        noise = np.random.randn(*result.shape) * settings.noise_amount * 30
        result = result + noise

    # 3. Slight blur (focus/scan quality) - ONLY if explicitly enabled
    if settings.blur_amount > 0.1:  # Threshold to avoid unnecessary blur
        blur_kernel = max(3, int(settings.blur_amount * 2 + 1)) | 1
        sigma = settings.blur_amount * 0.3  # Reduced sigma
        if len(result.shape) == 3:
            result = cv2.GaussianBlur(result, (blur_kernel, blur_kernel), sigma)
        else:
            result = cv2.GaussianBlur(result, (blur_kernel, blur_kernel), sigma)

    result = np.clip(result, 0, 255).astype(np.uint8)
    return result


def composite_ink_on_paper(
    ink_mask: np.ndarray, paper: np.ndarray, ink_color: Tuple[int, int, int] = (20, 20, 40)
) -> np.ndarray:
    """Composite ink onto paper using multiply blend"""
    height, width = ink_mask.shape

    # Ensure paper is same size
    if paper.shape[:2] != (height, width):
        paper = cv2.resize(paper, (width, height))

    # Convert ink mask to RGB ink layer
    ink_layer = np.zeros((height, width, 3), dtype=np.float32)
    ink_alpha = ink_mask.astype(np.float32) / 255  # 0 to 1

    for c in range(3):
        ink_layer[:, :, c] = ink_color[c]

    # Blend using alpha
    paper_float = paper.astype(np.float32)

    # Multiply blend for ink areas
    for c in range(3):
        # Where ink_alpha is high, darken paper towards ink_color
        blended = (
            paper_float[:, :, c] * (1 - ink_alpha)
            + (paper_float[:, :, c] * ink_layer[:, :, c] / 255) * ink_alpha
        )
        paper_float[:, :, c] = blended

    # Alternative: direct alpha blend for more solid ink
    for c in range(3):
        paper_float[:, :, c] = (
            paper_float[:, :, c] * (1 - ink_alpha * 0.9) + ink_layer[:, :, c] * ink_alpha * 0.9
        )

    return np.clip(paper_float, 0, 255).astype(np.uint8)


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join([c * 2 for c in hex_color])
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def color_name_to_rgb(color_name: str) -> Tuple[int, int, int]:
    """Convert color name to RGB tuple"""
    color_map = {
        "black": (20, 20, 30),
        "blue": (25, 40, 120),
        "darkblue": (20, 30, 80),
        "navy": (20, 30, 70),
        "red": (140, 30, 30),
        "darkred": (100, 20, 20),
        "green": (30, 80, 40),
        "darkgreen": (20, 60, 30),
        "purple": (80, 30, 100),
        "brown": (80, 50, 30),
    }
    return color_map.get(color_name.lower(), (20, 20, 30))


def process_realistic(
    svg_content: str,
    settings: RealisticSettings,
    stroke_color: str = "black",
    seed: Optional[int] = None,
) -> Tuple[bytes, int, int]:
    """
    Main function: Convert SVG to realistic handwriting image.

    Returns: (png_bytes, width, height)
    """
    if seed is None:
        seed = random.randint(0, 100000)

    # 1. Convert SVG to alpha mask
    ink_mask, width, height = svg_to_alpha_mask(svg_content)
    mask_array = np.array(ink_mask)

    # 2. Generate paper texture
    paper = generate_paper_texture(width, height, settings.paper_type, seed=seed)
    paper_array = np.array(paper)

    # 3. Apply edge roughness
    mask_array = apply_edge_roughness(mask_array, settings.edge_roughness, seed=seed)

    # 4. Apply feathering
    mask_array = apply_feathering(mask_array, settings.feathering)

    # 5. Apply pressure variation
    mask_array = apply_pressure_variation(mask_array, settings.pressure_variation, seed=seed + 50)

    # 6. Apply paper show-through
    mask_array = apply_paper_show_through(mask_array, paper_array, settings.paper_show_through)

    # 7. Get ink color
    if stroke_color.startswith("#"):
        ink_rgb = hex_to_rgb(stroke_color)
    else:
        ink_rgb = color_name_to_rgb(stroke_color)

    # 8. Composite ink on paper
    result = composite_ink_on_paper(mask_array, paper_array, ink_rgb)

    # 9. Apply scan artifacts
    result = apply_scan_artifacts(result, settings, seed=seed + 100)

    # 10. Convert to PIL and save as PNG
    result_image = Image.fromarray(result)

    # Optional: slight contrast/brightness adjustment
    if settings.wear_level > 0.5:
        enhancer = ImageEnhance.Contrast(result_image)
        result_image = enhancer.enhance(0.95)

    # Save to bytes
    buffer = io.BytesIO()
    result_image.save(buffer, format="PNG", optimize=True)
    png_bytes = buffer.getvalue()

    return png_bytes, width, height


def process_realistic_base64(
    svg_content: str,
    paper_type: str = "white",
    ink_type: str = "ballpoint",
    wear_level: float = 0.3,
    stroke_color: str = "black",
    seed: Optional[int] = None,
) -> dict:
    """
    Process SVG and return base64-encoded PNG with metadata.

    This is the main entry point for the API.
    """
    # Parse enum values
    try:
        paper = PaperType(paper_type)
    except ValueError:
        paper = PaperType.WHITE

    try:
        ink = InkType(ink_type)
    except ValueError:
        ink = InkType.BALLPOINT

    # Create settings from ink type
    settings = RealisticSettings.from_ink_type(ink, paper, wear_level)

    # Process
    png_bytes, width, height = process_realistic(svg_content, settings, stroke_color, seed)

    # Encode to base64
    png_base64 = base64.b64encode(png_bytes).decode("utf-8")

    return {
        "realistic_png": png_base64,
        "width": width,
        "height": height,
        "paper_type": paper_type,
        "ink_type": ink_type,
        "wear_level": wear_level,
    }
