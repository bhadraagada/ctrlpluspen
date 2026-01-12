"""
FastAPI backend for Handwriting Synthesis
Converts typed text to realistic handwritten SVG images
"""

import base64
import io
import os
import sys
import tempfile
from pathlib import Path
from typing import Optional, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

# Get the ref2 directory path
REF2_PATH = Path(__file__).parent.parent / "ref2"

# Change working directory to ref2 so model paths work correctly
os.chdir(REF2_PATH)

# Add ref2 to path for handwriting_synthesis import
sys.path.insert(0, str(REF2_PATH))

# Import post-processing module (after path setup)
from post_processing import process_realistic_base64, PaperType, InkType

app = FastAPI(
    title="Handwriting Synthesis API",
    description="Generate realistic handwritten text from typed input",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Valid characters for handwriting synthesis
VALID_CHARS = set(
    [
        "\x00",
        " ",
        "!",
        '"',
        "#",
        "'",
        "(",
        ")",
        ",",
        "-",
        ".",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        ":",
        ";",
        "?",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "Y",
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
    ]
)

MAX_CHARS_PER_LINE = 75
MAX_LINES = 20
VALID_STYLES = list(range(13))  # 0-12

# Lazy load the Hand model (heavy TensorFlow model)
_hand_instance = None


def get_hand():
    """Lazy load the Hand instance to avoid loading TensorFlow on import"""
    global _hand_instance
    if _hand_instance is None:
        from handwriting_synthesis import Hand

        _hand_instance = Hand()
    return _hand_instance


class SynthesisRequest(BaseModel):
    """Request model for handwriting synthesis"""

    text: str = Field(..., description="Text to convert to handwriting. Use \\n for line breaks.")
    style: int = Field(default=9, ge=0, le=12, description="Handwriting style (0-12)")
    bias: float = Field(
        default=0.75, ge=0.0, le=1.5, description="Neatness bias. 0=sloppy, 1+=neat"
    )
    stroke_color: str = Field(default="black", description="Stroke color (CSS color name or hex)")
    stroke_width: int = Field(default=2, ge=1, le=5, description="Stroke width in pixels")

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Text cannot be empty")

        lines = v.split("\n")
        if len(lines) > MAX_LINES:
            raise ValueError(f"Maximum {MAX_LINES} lines allowed")

        for i, line in enumerate(lines):
            if len(line) > MAX_CHARS_PER_LINE:
                raise ValueError(f"Line {i + 1} exceeds {MAX_CHARS_PER_LINE} characters")

            invalid_chars = [c for c in line if c not in VALID_CHARS]
            if invalid_chars:
                raise ValueError(
                    f"Invalid characters in line {i + 1}: {invalid_chars}. "
                    f"Note: Q, X, Z are not supported."
                )

        return v


class SynthesisResponse(BaseModel):
    """Response model for handwriting synthesis"""

    svg: str = Field(..., description="Base64 encoded SVG content")
    svg_raw: str = Field(..., description="Raw SVG content")
    lines_count: int = Field(..., description="Number of lines generated")
    characters_count: int = Field(..., description="Total characters processed")
    style: int = Field(..., description="Style used")
    bias: float = Field(..., description="Bias used")


class StyleInfo(BaseModel):
    """Information about a handwriting style"""

    id: int
    name: str
    description: str


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    model_loaded: bool
    valid_characters: str
    max_chars_per_line: int
    max_lines: int
    available_styles: int


class RealisticRequest(BaseModel):
    """Request model for realistic handwriting synthesis"""

    text: str = Field(..., description="Text to convert to handwriting")
    style: int = Field(default=9, ge=0, le=12, description="Handwriting style (0-12)")
    bias: float = Field(default=0.75, ge=0.0, le=1.5, description="Neatness bias")
    stroke_color: str = Field(default="black", description="Stroke color")
    stroke_width: int = Field(default=2, ge=1, le=5, description="Stroke width")

    # Realistic rendering options
    paper_type: str = Field(
        default="white", description="Paper type: white, cream, aged, lined, grid, recycled"
    )
    ink_type: str = Field(
        default="ballpoint", description="Ink type: ballpoint, gel, fountain, marker, pencil"
    )
    wear_level: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Wear/degradation level (0=pristine, 1=heavily worn)",
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Text cannot be empty")

        lines = v.split("\n")
        if len(lines) > MAX_LINES:
            raise ValueError(f"Maximum {MAX_LINES} lines allowed")

        for i, line in enumerate(lines):
            if len(line) > MAX_CHARS_PER_LINE:
                raise ValueError(f"Line {i + 1} exceeds {MAX_CHARS_PER_LINE} characters")

            invalid_chars = [c for c in line if c not in VALID_CHARS]
            if invalid_chars:
                raise ValueError(
                    f"Invalid characters in line {i + 1}: {invalid_chars}. "
                    f"Note: Q, X, Z are not supported."
                )

        return v


class RealisticResponse(BaseModel):
    """Response model for realistic handwriting synthesis"""

    svg_raw: str = Field(..., description="Original SVG content")
    realistic_png: str = Field(..., description="Base64 encoded realistic PNG")
    width: int = Field(..., description="Image width")
    height: int = Field(..., description="Image height")
    lines_count: int = Field(..., description="Number of lines generated")
    characters_count: int = Field(..., description="Total characters processed")
    style: int = Field(..., description="Style used")
    bias: float = Field(..., description="Bias used")
    paper_type: str = Field(..., description="Paper type used")
    ink_type: str = Field(..., description="Ink type used")
    wear_level: float = Field(..., description="Wear level applied")


class RealisticFromSvgRequest(BaseModel):
    """Request model for converting existing SVG to realistic image"""

    svg_content: str = Field(..., description="Raw SVG content to process")
    stroke_color: str = Field(
        default="black", description="Original stroke color for ink rendering"
    )
    paper_type: str = Field(
        default="white", description="Paper type: white, cream, aged, lined, grid, recycled"
    )
    ink_type: str = Field(
        default="ballpoint", description="Ink type: ballpoint, gel, fountain, marker, pencil"
    )
    wear_level: float = Field(default=0.3, ge=0.0, le=1.0, description="Wear/degradation level")


@app.get("/", response_model=HealthResponse)
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    model_loaded = _hand_instance is not None
    return HealthResponse(
        status="healthy",
        model_loaded=model_loaded,
        valid_characters="".join(
            sorted([c for c in VALID_CHARS if c.isprintable() and c != "\x00"])
        ),
        max_chars_per_line=MAX_CHARS_PER_LINE,
        max_lines=MAX_LINES,
        available_styles=13,
    )


@app.get("/styles", response_model=list[StyleInfo])
async def get_styles():
    """Get all available handwriting styles"""
    styles = [
        StyleInfo(id=0, name="Style 0", description="Clean cursive style"),
        StyleInfo(id=1, name="Style 1", description="Slightly slanted cursive"),
        StyleInfo(id=2, name="Style 2", description="Rounded handwriting"),
        StyleInfo(id=3, name="Style 3", description="Compact script"),
        StyleInfo(id=4, name="Style 4", description="Wide spaced letters"),
        StyleInfo(id=5, name="Style 5", description="Elegant flowing script"),
        StyleInfo(id=6, name="Style 6", description="Quick note style"),
        StyleInfo(id=7, name="Style 7", description="Neat print-like"),
        StyleInfo(id=8, name="Style 8", description="Artistic flourish"),
        StyleInfo(id=9, name="Style 9", description="Natural everyday writing"),
        StyleInfo(id=10, name="Style 10", description="Bold confident strokes"),
        StyleInfo(id=11, name="Style 11", description="Light delicate script"),
        StyleInfo(id=12, name="Style 12", description="Classic formal hand"),
    ]
    return styles


@app.post("/synthesize", response_model=SynthesisResponse)
async def synthesize_handwriting(request: SynthesisRequest):
    """
    Convert text to handwritten SVG

    - **text**: The text to convert (max 75 chars per line, max 20 lines)
    - **style**: Handwriting style from 0-12
    - **bias**: Neatness (0=sloppy, 0.75=default, 1+=very neat)
    - **stroke_color**: CSS color for the handwriting
    - **stroke_width**: Thickness of strokes (1-5)
    """
    try:
        hand = get_hand()

        # Split text into lines
        lines = request.text.split("\n")

        # Filter out empty lines but keep track of them for spacing
        # The library handles empty strings for line spacing

        # Prepare parameters for each line
        biases = [request.bias] * len(lines)
        styles = [request.style] * len(lines)
        stroke_colors = [request.stroke_color] * len(lines)
        stroke_widths = [request.stroke_width] * len(lines)

        # Generate SVG to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            hand.write(
                filename=tmp_path,
                lines=lines,
                biases=biases,
                styles=styles,
                stroke_colors=stroke_colors,
                stroke_widths=stroke_widths,
            )

            # Read the generated SVG
            with open(tmp_path, "r", encoding="utf-8") as f:
                svg_content = f.read()
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        # Encode to base64
        svg_base64 = base64.b64encode(svg_content.encode("utf-8")).decode("utf-8")

        return SynthesisResponse(
            svg=svg_base64,
            svg_raw=svg_content,
            lines_count=len(lines),
            characters_count=sum(len(line) for line in lines),
            style=request.style,
            bias=request.bias,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")


@app.post("/synthesize/svg")
async def synthesize_svg_direct(request: SynthesisRequest):
    """
    Generate handwriting and return SVG file directly
    Use this endpoint for direct SVG downloads
    """
    try:
        response = await synthesize_handwriting(request)
        return Response(
            content=response.svg_raw,
            media_type="image/svg+xml",
            headers={"Content-Disposition": f"attachment; filename=handwriting.svg"},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")


@app.get("/valid-characters")
async def get_valid_characters():
    """Get list of all valid characters for synthesis"""
    printable = sorted([c for c in VALID_CHARS if c.isprintable() and c != "\x00"])
    return {
        "characters": printable,
        "characters_string": "".join(printable),
        "unsupported_letters": ["Q", "X", "Z"],
        "note": "These characters are case-sensitive. Q, X, Z are not supported.",
    }


@app.post("/synthesize/realistic", response_model=RealisticResponse)
async def synthesize_realistic(request: RealisticRequest):
    """
    Generate realistic handwriting with paper texture and ink effects.

    Returns both the original SVG and a processed PNG that looks like
    real pen on paper with:
    - Paper texture (fibers, grain)
    - Ink effects (feathering, pressure variation, edge roughness)
    - Scan artifacts (noise, uneven lighting)

    Paper types: white, cream, aged, lined, grid, recycled
    Ink types: ballpoint, gel, fountain, marker, pencil
    """
    try:
        # First generate the SVG
        hand = get_hand()
        lines = request.text.split("\n")

        biases = [request.bias] * len(lines)
        styles = [request.style] * len(lines)
        stroke_colors = [request.stroke_color] * len(lines)
        stroke_widths = [request.stroke_width] * len(lines)

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            hand.write(
                filename=tmp_path,
                lines=lines,
                biases=biases,
                styles=styles,
                stroke_colors=stroke_colors,
                stroke_widths=stroke_widths,
            )

            with open(tmp_path, "r", encoding="utf-8") as f:
                svg_content = f.read()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        # Now apply realistic post-processing
        result = process_realistic_base64(
            svg_content=svg_content,
            paper_type=request.paper_type,
            ink_type=request.ink_type,
            wear_level=request.wear_level,
            stroke_color=request.stroke_color,
        )

        return RealisticResponse(
            svg_raw=svg_content,
            realistic_png=result["realistic_png"],
            width=result["width"],
            height=result["height"],
            lines_count=len(lines),
            characters_count=sum(len(line) for line in lines),
            style=request.style,
            bias=request.bias,
            paper_type=result["paper_type"],
            ink_type=result["ink_type"],
            wear_level=result["wear_level"],
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing dependency: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Realistic synthesis failed: {str(e)}")


@app.post("/process/realistic")
async def process_svg_to_realistic(request: RealisticFromSvgRequest):
    """
    Convert an existing SVG to a realistic handwriting image.

    Use this endpoint when you already have an SVG and want to
    apply realistic post-processing to it.
    """
    try:
        result = process_realistic_base64(
            svg_content=request.svg_content,
            paper_type=request.paper_type,
            ink_type=request.ink_type,
            wear_level=request.wear_level,
            stroke_color=request.stroke_color,
        )

        return {
            "realistic_png": result["realistic_png"],
            "width": result["width"],
            "height": result["height"],
            "paper_type": result["paper_type"],
            "ink_type": result["ink_type"],
            "wear_level": result["wear_level"],
        }

    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing dependency: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.get("/realistic/options")
async def get_realistic_options():
    """Get available options for realistic rendering"""
    return {
        "paper_types": [
            {"id": "white", "name": "White Paper", "description": "Clean white paper"},
            {"id": "cream", "name": "Cream Paper", "description": "Warm ivory/cream colored"},
            {"id": "aged", "name": "Aged Paper", "description": "Yellowed, vintage look"},
            {"id": "lined", "name": "Lined Paper", "description": "Blue horizontal lines"},
            {"id": "grid", "name": "Grid Paper", "description": "Light blue grid pattern"},
            {
                "id": "recycled",
                "name": "Recycled Paper",
                "description": "Grayish with visible fibers",
            },
        ],
        "ink_types": [
            {
                "id": "ballpoint",
                "name": "Ballpoint Pen",
                "description": "Standard ballpoint, medium pressure variation",
            },
            {"id": "gel", "name": "Gel Pen", "description": "Smooth, consistent ink flow"},
            {"id": "fountain", "name": "Fountain Pen", "description": "High variation, feathering"},
            {"id": "marker", "name": "Marker", "description": "Bold, minimal texture show-through"},
            {"id": "pencil", "name": "Pencil", "description": "High texture, light strokes"},
        ],
        "wear_level": {
            "min": 0.0,
            "max": 1.0,
            "default": 0.3,
            "description": "0 = pristine digital, 1 = heavily worn/scanned document",
        },
    }


# ============================================================================
# TrOCR-based Full OCR Endpoints
# ============================================================================

# Lazy load the TrOCR module
_trocr_module = None


def get_trocr():
    """Lazy load the TrOCR module"""
    global _trocr_module
    if _trocr_module is None:
        from trocr_ocr import (
            recognize_from_base64,
            recognize_document,
            check_trocr_available,
        )

        _trocr_module = {
            "recognize_from_base64": recognize_from_base64,
            "recognize_document": recognize_document,
            "check_available": check_trocr_available,
        }
    return _trocr_module


class OCRRequest(BaseModel):
    """Request model for OCR from base64 image"""

    image_base64: str = Field(..., description="Base64 encoded image (PNG/JPEG)")
    preprocess: bool = Field(default=True, description="Whether to preprocess the image")
    segment_lines: bool = Field(default=True, description="Whether to segment into lines")


class OCRLineResult(BaseModel):
    """Result for a single line of text"""

    line_number: int
    text: str
    confidence: float


class OCRResponse(BaseModel):
    """Response model for OCR"""

    text: str = Field(..., description="Full recognized text")
    lines: list[OCRLineResult] = Field(..., description="Individual line results")
    num_lines: int = Field(..., description="Number of lines detected")
    avg_confidence: float = Field(..., description="Average confidence score")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")


@app.post("/ocr/recognize", response_model=OCRResponse)
async def ocr_recognize(request: OCRRequest):
    """
    Recognize handwritten text from an image using TrOCR.

    - **image_base64**: Base64 encoded image of handwritten text
    - **preprocess**: Whether to preprocess the image (recommended)
    - **segment_lines**: Whether to segment into individual lines

    Returns the recognized text with line-by-line results and confidence scores.
    """
    try:
        trocr = get_trocr()

        result = trocr["recognize_from_base64"](
            request.image_base64,
            preprocess=request.preprocess,
            segment_lines_enabled=request.segment_lines,
        )

        return OCRResponse(
            text=result["text"],
            lines=[
                OCRLineResult(
                    line_number=line["line_number"],
                    text=line["text"],
                    confidence=round(line["confidence"], 4),
                )
                for line in result["lines"]
            ],
            num_lines=result["num_lines"],
            avg_confidence=round(result["avg_confidence"], 4),
            processing_time_ms=round(result["processing_time_ms"], 2),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


@app.get("/ocr/health")
async def ocr_health():
    """Check if OCR service is available and ready"""
    try:
        trocr = get_trocr()
        status = trocr["check_available"]()

        # Determine device
        device = "unknown"
        if status["pytorch_installed"]:
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"

        return {
            "status": "healthy" if status["ready"] else "unavailable",
            "models_loaded": _trocr_module is not None,
            "device": device,
            "dependencies": status,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "models_loaded": False,
            "device": "unknown",
            "error": str(e),
        }


@app.get("/ocr/info")
async def get_ocr_info():
    """Get information about the OCR service"""
    try:
        trocr = get_trocr()
        status = trocr["check_available"]()

        return {
            "service": "TrOCR Handwriting Recognition",
            "model": "microsoft/trocr-base-handwritten",
            "description": "Transformer-based OCR specifically trained for handwritten text",
            "capabilities": [
                "Handwritten text recognition",
                "Multi-line document support",
                "Automatic line segmentation",
                "Image preprocessing",
            ],
            "supported_formats": ["PNG", "JPEG", "WebP", "BMP"],
            "max_image_size": "Recommended under 2000x2000 pixels",
            "dependencies_ready": status["ready"],
            "note": "For best results, use clear images with good contrast",
        }
    except Exception as e:
        return {
            "service": "TrOCR Handwriting Recognition",
            "status": "unavailable",
            "error": str(e),
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
