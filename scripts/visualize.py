"""
Visualization Utilities
Draw detection boxes and OCR text overlays
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import cv2
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import patches


# Color palette for visualization
COLORS = [
    (0, 255, 0),    # Green
    (255, 0, 0),    # Blue (BGR)
    (0, 0, 255),    # Red
    (255, 255, 0),  # Cyan
    (255, 0, 255),  # Magenta
    (0, 255, 255),  # Yellow
]


def get_color(idx: int) -> Tuple[int, int, int]:
    """Get color for index."""
    return COLORS[idx % len(COLORS)]


def draw_box(
    image: np.ndarray,
    box: List[int],
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2,
    label: str = None,
    label_position: str = 'top',  # 'top' or 'bottom'
) -> np.ndarray:
    """Draw a single bounding box with optional label."""
    x1, y1, x2, y2 = box
    
    # Draw rectangle
    cv2.rectangle(image, (x1, y1), (x2, y2), color, thickness)
    
    # Draw label
    if label:
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_thickness = 1
        
        (text_w, text_h), baseline = cv2.getTextSize(
            label, font, font_scale, font_thickness
        )
        
        if label_position == 'top':
            label_y1 = max(0, y1 - text_h - 4)
            label_y2 = y1
            text_y = y1 - 2
        else:
            label_y1 = y2
            label_y2 = min(image.shape[0], y2 + text_h + 4)
            text_y = y2 + text_h + 2
        
        # Background rectangle
        cv2.rectangle(
            image,
            (x1, label_y1),
            (x1 + text_w + 4, label_y2),
            color,
            -1
        )
        
        # Text
        cv2.putText(
            image,
            label,
            (x1 + 2, text_y),
            font,
            font_scale,
            (255, 255, 255),
            font_thickness,
        )
    
    return image


def draw_detections(
    image: np.ndarray,
    detections: List[Dict],
    show_confidence: bool = True,
    show_id: bool = True,
    show_ocr: bool = True,
    color_by_line: bool = True,
) -> np.ndarray:
    """
    Draw all detections on image.
    
    Args:
        image: Input image
        detections: List of detection dictionaries
        show_confidence: Show confidence scores
        show_id: Show detection IDs
        show_ocr: Show OCR text
        color_by_line: Color boxes by line ID
    """
    img = image.copy()
    
    for det in detections:
        box = det['box']
        conf = det.get('confidence', 0)
        det_id = det.get('id', 0)
        line_id = det.get('line_id', 0)
        ocr_text = det.get('ocr_text', '')
        
        # Choose color
        if color_by_line:
            color = get_color(line_id)
        else:
            color = get_color(det_id)
        
        # Build label
        label_parts = []
        if show_id:
            label_parts.append(f"#{det_id}")
        if show_confidence:
            label_parts.append(f"{conf:.2f}")
        
        top_label = " ".join(label_parts) if label_parts else None
        
        # Draw box with top label
        draw_box(img, box, color, 2, top_label, 'top')
        
        # Draw OCR text below
        if show_ocr and ocr_text:
            draw_box(img, box, color, 0, ocr_text[:30], 'bottom')
    
    return img


def draw_lines(
    image: np.ndarray,
    detections: List[Dict],
    connect_lines: bool = True,
) -> np.ndarray:
    """Draw line connections between boxes."""
    img = image.copy()
    
    # Group by line
    lines = {}
    for det in detections:
        line_id = det.get('line_id', 0)
        if line_id not in lines:
            lines[line_id] = []
        lines[line_id].append(det)
    
    # Sort boxes in each line
    for line_id in lines:
        lines[line_id].sort(key=lambda d: d['box'][0])
    
    # Draw connections
    if connect_lines:
        for line_id, line_dets in lines.items():
            color = get_color(line_id)
            
            for i in range(len(line_dets) - 1):
                box1 = line_dets[i]['box']
                box2 = line_dets[i + 1]['box']
                
                # Connect right edge of box1 to left edge of box2
                center_y1 = (box1[1] + box1[3]) // 2
                center_y2 = (box2[1] + box2[3]) // 2
                
                cv2.line(
                    img,
                    (box1[2], center_y1),
                    (box2[0], center_y2),
                    color,
                    1,
                    cv2.LINE_AA
                )
    
    return img


def draw_results(
    image: np.ndarray,
    result: Dict,
    show_confidence: bool = True,
    show_id: bool = False,
    show_ocr: bool = True,
    show_lines: bool = True,
    show_text_box: bool = True,
) -> np.ndarray:
    """
    Draw complete results visualization.
    
    Args:
        image: Input image
        result: Result dictionary from predict()
        show_confidence: Show confidence scores
        show_id: Show detection IDs
        show_ocr: Show OCR text on boxes
        show_lines: Draw line connections
        show_text_box: Show aggregated text box
    """
    img = image.copy()
    detections = result.get('detections', [])
    
    # Draw detections
    img = draw_detections(
        img, detections,
        show_confidence=show_confidence,
        show_id=show_id,
        show_ocr=show_ocr,
    )
    
    # Draw line connections
    if show_lines:
        img = draw_lines(img, detections)
    
    # Draw text box
    if show_text_box:
        text = result.get('aggregated_text', '')
        if text:
            img = draw_text_box(img, text)
    
    return img


def draw_text_box(
    image: np.ndarray,
    text: str,
    position: str = 'bottom',  # 'top' or 'bottom'
    max_width: int = None,
    font_scale: float = 0.6,
    padding: int = 10,
) -> np.ndarray:
    """Draw a text box with recognized text."""
    img = image.copy()
    h, w = img.shape[:2]
    max_width = max_width or w
    
    # Split text into lines
    lines = text.split('\n')
    
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_thickness = 1
    line_height = int(25 * font_scale)
    
    # Wrap long lines
    wrapped_lines = []
    for line in lines:
        while len(line) > 60:
            wrapped_lines.append(line[:60])
            line = line[60:]
        wrapped_lines.append(line)
    
    # Calculate box size
    box_height = len(wrapped_lines) * line_height + 2 * padding
    box_width = w
    
    # Create semi-transparent overlay
    if position == 'bottom':
        y_start = h - box_height
    else:
        y_start = 0
    
    overlay = img.copy()
    cv2.rectangle(
        overlay,
        (0, y_start),
        (box_width, y_start + box_height),
        (0, 0, 0),
        -1
    )
    img = cv2.addWeighted(overlay, 0.7, img, 0.3, 0)
    
    # Draw text
    y = y_start + padding + line_height
    for line in wrapped_lines:
        cv2.putText(
            img,
            line,
            (padding, y),
            font,
            font_scale,
            (255, 255, 255),
            font_thickness,
            cv2.LINE_AA,
        )
        y += line_height
    
    return img


def create_comparison_figure(
    original: np.ndarray,
    result: Dict,
    figsize: Tuple[int, int] = (16, 8),
) -> plt.Figure:
    """Create a matplotlib figure comparing original and annotated images."""
    fig, axes = plt.subplots(1, 2, figsize=figsize)
    
    # Original
    axes[0].imshow(cv2.cvtColor(original, cv2.COLOR_BGR2RGB))
    axes[0].set_title('Original Image')
    axes[0].axis('off')
    
    # Annotated
    annotated = draw_results(original, result)
    axes[1].imshow(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
    axes[1].set_title(f"Detected: {result.get('num_detections', 0)} regions")
    axes[1].axis('off')
    
    plt.tight_layout()
    return fig


def visualize_json_file(
    json_path: Path,
    image_path: Path = None,
    output_path: Path = None,
    show: bool = True,
):
    """Visualize results from a JSON file."""
    with open(json_path, 'r') as f:
        result = json.load(f)
    
    # Find image path
    if image_path is None:
        image_path = Path(result.get('image_path', ''))
    
    if not image_path.exists():
        print(f"❌ Image not found: {image_path}")
        return
    
    # Load image
    image = cv2.imread(str(image_path))
    
    # Draw results
    annotated = draw_results(image, result)
    
    # Save
    if output_path:
        cv2.imwrite(str(output_path), annotated)
        print(f"✅ Saved to: {output_path}")
    
    # Show
    if show:
        fig = create_comparison_figure(image, result)
        plt.show()


def main():
    parser = argparse.ArgumentParser(
        description='Visualize handwriting detection and OCR results',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Input
    parser.add_argument('--json', '-j', type=str, required=True,
                       help='Path to result JSON file')
    parser.add_argument('--image', '-i', type=str, default=None,
                       help='Path to original image (optional)')
    
    # Output
    parser.add_argument('--output', '-o', type=str, default=None,
                       help='Output image path')
    parser.add_argument('--no-show', action='store_true',
                       help='Do not display figure')
    
    # Visualization options
    parser.add_argument('--no-conf', action='store_true',
                       help='Hide confidence scores')
    parser.add_argument('--show-id', action='store_true',
                       help='Show detection IDs')
    parser.add_argument('--no-ocr', action='store_true',
                       help='Hide OCR text')
    parser.add_argument('--no-lines', action='store_true',
                       help='Hide line connections')
    parser.add_argument('--no-text-box', action='store_true',
                       help='Hide text box')
    
    args = parser.parse_args()
    
    json_path = Path(args.json)
    if not json_path.exists():
        print(f"❌ JSON file not found: {json_path}")
        sys.exit(1)
    
    image_path = Path(args.image) if args.image else None
    output_path = Path(args.output) if args.output else None
    
    # Load result
    with open(json_path, 'r') as f:
        result = json.load(f)
    
    # Find image
    if image_path is None:
        image_path = Path(result.get('image_path', ''))
    
    if not image_path.exists():
        print(f"❌ Image not found: {image_path}")
        print("Specify image path with --image")
        sys.exit(1)
    
    # Load and process
    image = cv2.imread(str(image_path))
    
    annotated = draw_results(
        image, result,
        show_confidence=not args.no_conf,
        show_id=args.show_id,
        show_ocr=not args.no_ocr,
        show_lines=not args.no_lines,
        show_text_box=not args.no_text_box,
    )
    
    # Save
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(output_path), annotated)
        print(f"✅ Saved visualization to: {output_path}")
    
    # Show
    if not args.no_show:
        fig = create_comparison_figure(image, result)
        plt.show()


if __name__ == "__main__":
    main()
