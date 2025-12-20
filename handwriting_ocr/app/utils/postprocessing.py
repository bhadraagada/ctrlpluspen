"""
Text postprocessing utilities
"""

from typing import List, Dict


def order_text_regions(detections: List[Dict]) -> List[Dict]:
    """Order text regions top-to-bottom, left-to-right"""
    return sorted(detections, key=lambda x: (x["bbox"][1], x["bbox"][0]))


def merge_text_lines(regions: List) -> str:
    """Merge text regions into full text"""
    return " ".join([r.text for r in regions if r.text])
