"""
FastAPI application for Handwriting OCR
Provides endpoints for handwriting detection and recognition
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Security
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from typing import List, Optional
import logging
import os
import time
from PIL import Image
import io

from app.models.detector import HandwritingDetector
from app.models.recognizer import HandwritingRecognizer
from app.utils.preprocessing import preprocess_image
from app.utils.postprocessing import order_text_regions, merge_text_lines

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Handwriting OCR API",
    description="Detect and recognize handwritten text in images using YOLOv8 + TrOCR",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key authentication (optional)
API_KEY = os.getenv("API_KEY", None)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify API key if enabled"""
    if API_KEY and api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key


# Initialize models globally
detector = None
recognizer = None


@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    global detector, recognizer

    logger.info("Initializing models...")

    detector_path = os.getenv("DETECTOR_PATH", "../models/detector/best.pt")
    device = os.getenv("DEVICE", "cuda")

    try:
        detector = HandwritingDetector(model_path=detector_path, device=device)
        recognizer = HandwritingRecognizer(device=device)
        logger.info(f"Models initialized successfully on {device}")
    except Exception as e:
        logger.error(f"Failed to initialize models: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down...")


# Response models
class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float


class TextRegion(BaseModel):
    text: str
    confidence: float
    bounding_box: BoundingBox


class DetectionResponse(BaseModel):
    num_detections: int
    bounding_boxes: List[BoundingBox]
    inference_time_ms: float


class RecognitionResponse(BaseModel):
    text: str
    regions: List[TextRegion]
    num_regions: int
    avg_confidence: float
    total_inference_time_ms: float


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": detector is not None and recognizer is not None,
        "device": os.getenv("DEVICE", "cuda"),
    }


@app.post("/detect", response_model=DetectionResponse)
async def detect_handwriting(
    image: UploadFile = File(...),
    confidence_threshold: float = 0.5,
    api_key: str = Depends(verify_api_key),
):
    """Detect handwriting regions in an image"""
    if not detector:
        raise HTTPException(status_code=503, detail="Detector model not loaded")

    if image.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG or PNG")

    try:
        contents = await image.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

        img = Image.open(io.BytesIO(contents))

        start_time = time.time()
        detections = detector.detect(img, conf_threshold=confidence_threshold)
        inference_time = (time.time() - start_time) * 1000

        bboxes = [
            BoundingBox(
                x1=float(det["bbox"][0]),
                y1=float(det["bbox"][1]),
                x2=float(det["bbox"][2]),
                y2=float(det["bbox"][3]),
                confidence=float(det["confidence"]),
            )
            for det in detections
        ]

        logger.info(f"Detected {len(bboxes)} regions in {inference_time:.2f}ms")

        return DetectionResponse(
            num_detections=len(bboxes), bounding_boxes=bboxes, inference_time_ms=inference_time
        )

    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@app.post("/recognize", response_model=RecognitionResponse)
async def recognize_handwriting(
    image: UploadFile = File(...),
    confidence_threshold: float = 0.5,
    preprocess: bool = True,
    api_key: str = Depends(verify_api_key),
):
    """Full OCR pipeline: detect and recognize handwritten text"""
    if not detector or not recognizer:
        raise HTTPException(status_code=503, detail="Models not loaded")

    if image.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        contents = await image.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large")

        img = Image.open(io.BytesIO(contents))

        if preprocess:
            img = preprocess_image(img)

        start_time = time.time()
        detections = detector.detect(img, conf_threshold=confidence_threshold)

        if not detections:
            return RecognitionResponse(
                text="",
                regions=[],
                num_regions=0,
                avg_confidence=0.0,
                total_inference_time_ms=(time.time() - start_time) * 1000,
            )

        detections = order_text_regions(detections)

        regions = []
        total_confidence = 0.0

        for det in detections:
            bbox = det["bbox"]
            crop = img.crop((bbox[0], bbox[1], bbox[2], bbox[3]))
            text, conf = recognizer.recognize(crop)

            regions.append(
                TextRegion(
                    text=text,
                    confidence=conf,
                    bounding_box=BoundingBox(
                        x1=float(bbox[0]),
                        y1=float(bbox[1]),
                        x2=float(bbox[2]),
                        y2=float(bbox[3]),
                        confidence=float(det["confidence"]),
                    ),
                )
            )
            total_confidence += conf

        full_text = merge_text_lines(regions)
        total_time = (time.time() - start_time) * 1000
        avg_conf = total_confidence / len(regions) if regions else 0.0

        logger.info(f"Recognized {len(regions)} regions in {total_time:.2f}ms")

        return RecognitionResponse(
            text=full_text,
            regions=regions,
            num_regions=len(regions),
            avg_confidence=avg_conf,
            total_inference_time_ms=total_time,
        )

    except Exception as e:
        logger.error(f"Recognition error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
