"""
Post-Processing Script
Orders detected boxes and merges OCR results into coherent text
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

import numpy as np


@dataclass
class DetectionBox:
    """Represents a detected text region."""
    id: int
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float
    ocr_text: str = ""
    ocr_confidence: float = 0.0
    line_id: int = -1
    
    @property
    def center_x(self) -> float:
        return (self.x1 + self.x2) / 2
    
    @property
    def center_y(self) -> float:
        return (self.y1 + self.y2) / 2
    
    @property
    def width(self) -> int:
        return self.x2 - self.x1
    
    @property
    def height(self) -> int:
        return self.y2 - self.y1
    
    def vertical_overlap(self, other: 'DetectionBox') -> float:
        """Calculate vertical overlap ratio with another box."""
        y_overlap = max(0, min(self.y2, other.y2) - max(self.y1, other.y1))
        min_height = min(self.height, other.height)
        return y_overlap / min_height if min_height > 0 else 0
    
    def horizontal_distance(self, other: 'DetectionBox') -> int:
        """Calculate horizontal distance to another box."""
        if self.x2 < other.x1:
            return other.x1 - self.x2
        elif other.x2 < self.x1:
            return self.x1 - other.x2
        else:
            return 0  # Overlapping


def parse_detections(data: Dict) -> List[DetectionBox]:
    """Parse detection data into DetectionBox objects."""
    boxes = []
    
    detections = data.get('detections', [])
    
    for det in detections:
        box_coords = det.get('box', [0, 0, 0, 0])
        
        boxes.append(DetectionBox(
            id=det.get('id', len(boxes)),
            x1=box_coords[0],
            y1=box_coords[1],
            x2=box_coords[2],
            y2=box_coords[3],
            confidence=det.get('confidence', 0.0),
            ocr_text=det.get('ocr_text', ''),
            ocr_confidence=det.get('ocr_confidence', 0.0),
        ))
    
    return boxes


def group_into_lines(
    boxes: List[DetectionBox],
    y_overlap_threshold: float = 0.5,
) -> List[List[DetectionBox]]:
    """
    Group boxes into text lines based on vertical overlap.
    
    Args:
        boxes: List of detection boxes
        y_overlap_threshold: Minimum vertical overlap ratio to be on same line
        
    Returns:
        List of lines, each line is a list of boxes sorted left-to-right
    """
    if not boxes:
        return []
    
    # Sort by y-coordinate (top to bottom)
    sorted_boxes = sorted(boxes, key=lambda b: b.center_y)
    
    lines = []
    used = set()
    
    for box in sorted_boxes:
        if box.id in used:
            continue
        
        # Start a new line with this box
        current_line = [box]
        used.add(box.id)
        
        # Find other boxes that belong to this line
        for other in sorted_boxes:
            if other.id in used:
                continue
            
            # Check if any box in current line has enough vertical overlap
            for line_box in current_line:
                if line_box.vertical_overlap(other) >= y_overlap_threshold:
                    current_line.append(other)
                    used.add(other.id)
                    break
        
        # Sort line boxes left-to-right
        current_line.sort(key=lambda b: b.center_x)
        lines.append(current_line)
    
    # Sort lines top-to-bottom by average y
    lines.sort(key=lambda line: sum(b.center_y for b in line) / len(line))
    
    # Assign line IDs
    for line_id, line in enumerate(lines):
        for box in line:
            box.line_id = line_id
    
    return lines


def merge_line_text(
    line: List[DetectionBox],
    space_threshold: float = 0.3,
) -> str:
    """
    Merge OCR text from boxes in a line.
    
    Args:
        line: List of boxes in a line (sorted left-to-right)
        space_threshold: Add space if gap is larger than this ratio of avg height
        
    Returns:
        Merged text string
    """
    if not line:
        return ""
    
    avg_height = sum(b.height for b in line) / len(line)
    space_pixels = avg_height * space_threshold
    
    text_parts = []
    
    for i, box in enumerate(line):
        if i > 0:
            prev_box = line[i - 1]
            gap = box.x1 - prev_box.x2
            
            # Add space if there's a significant gap
            if gap > space_pixels:
                text_parts.append(" ")
        
        text_parts.append(box.ocr_text)
    
    return "".join(text_parts)


def merge_all_text(
    lines: List[List[DetectionBox]],
    line_separator: str = "\n",
) -> str:
    """Merge all lines into full document text."""
    line_texts = []
    
    for line in lines:
        line_text = merge_line_text(line)
        if line_text.strip():
            line_texts.append(line_text.strip())
    
    return line_separator.join(line_texts)


def postprocess_detections(
    data: Dict,
    y_overlap_threshold: float = 0.5,
    space_threshold: float = 0.3,
) -> Dict:
    """
    Full post-processing pipeline.
    
    Args:
        data: Detection data dictionary
        y_overlap_threshold: Threshold for line grouping
        space_threshold: Threshold for word spacing
        
    Returns:
        Updated data dictionary with lines and aggregated text
    """
    # Parse detections
    boxes = parse_detections(data)
    
    if not boxes:
        data['lines'] = []
        data['aggregated_text'] = ""
        return data
    
    # Group into lines
    lines = group_into_lines(boxes, y_overlap_threshold)
    
    # Update detection entries with line IDs
    box_dict = {b.id: b for b in boxes}
    for det in data.get('detections', []):
        det_id = det.get('id')
        if det_id in box_dict:
            det['line_id'] = box_dict[det_id].line_id
    
    # Create line entries
    data['lines'] = []
    for line_id, line in enumerate(lines):
        line_text = merge_line_text(line, space_threshold)
        data['lines'].append({
            'line_id': line_id,
            'text': line_text,
            'box_ids': [b.id for b in line],
            'num_boxes': len(line),
        })
    
    # Create aggregated text
    data['aggregated_text'] = merge_all_text(lines)
    
    return data


def process_json_file(
    input_path: Path,
    output_path: Path,
    y_overlap_threshold: float = 0.5,
    space_threshold: float = 0.3,
):
    """Process a single JSON file."""
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Handle multi-image format
    if 'images' in data:
        for img_data in data['images']:
            postprocess_detections(
                img_data, y_overlap_threshold, space_threshold
            )
    else:
        postprocess_detections(
            data, y_overlap_threshold, space_threshold
        )
    
    # Save output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return data


def main():
    parser = argparse.ArgumentParser(
        description='Post-process detection and OCR results',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument('--input', '-i', type=str, required=True,
                       help='Input JSON file with detections and OCR')
    parser.add_argument('--output', '-o', type=str, default=None,
                       help='Output JSON file (default: input_postprocessed.json)')
    
    # Processing parameters
    parser.add_argument('--y-overlap', type=float, default=0.5,
                       help='Minimum vertical overlap ratio for line grouping')
    parser.add_argument('--space-threshold', type=float, default=0.3,
                       help='Gap ratio threshold for word spacing')
    
    # Output options
    parser.add_argument('--print-text', action='store_true',
                       help='Print aggregated text to console')
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ Input file not found: {input_path}")
        sys.exit(1)
    
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.parent / f"{input_path.stem}_postprocessed.json"
    
    print(f"Processing: {input_path}")
    
    data = process_json_file(
        input_path=input_path,
        output_path=output_path,
        y_overlap_threshold=args.y_overlap,
        space_threshold=args.space_threshold,
    )
    
    print(f"✅ Output saved to: {output_path}")
    
    # Print text if requested
    if args.print_text:
        print("\n" + "="*60)
        print(" Aggregated Text")
        print("="*60)
        
        if 'images' in data:
            for img_data in data['images']:
                print(f"\n--- {img_data.get('image_path', 'Unknown')} ---")
                print(img_data.get('aggregated_text', ''))
        else:
            print(data.get('aggregated_text', ''))
    
    # Print summary
    if 'images' in data:
        total_lines = sum(len(img.get('lines', [])) for img in data['images'])
        print(f"\nProcessed {len(data['images'])} images, {total_lines} lines")
    else:
        print(f"\nProcessed {len(data.get('lines', []))} lines")


if __name__ == "__main__":
    main()
