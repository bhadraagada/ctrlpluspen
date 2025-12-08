"""
Evaluation Script
Computes detection mAP and OCR CER/WER metrics
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

import numpy as np
from tqdm import tqdm


def calculate_iou(box1: List[int], box2: List[int]) -> float:
    """Calculate Intersection over Union between two boxes."""
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2
    
    # Intersection
    x1_i = max(x1_1, x1_2)
    y1_i = max(y1_1, y1_2)
    x2_i = min(x2_1, x2_2)
    y2_i = min(y2_1, y2_2)
    
    if x2_i <= x1_i or y2_i <= y1_i:
        return 0.0
    
    intersection = (x2_i - x1_i) * (y2_i - y1_i)
    
    # Union
    area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
    union = area1 + area2 - intersection
    
    return intersection / union if union > 0 else 0.0


def calculate_ap(precisions: List[float], recalls: List[float]) -> float:
    """Calculate Average Precision from precision-recall curve."""
    # Add sentinel values
    precisions = [0.0] + list(precisions) + [0.0]
    recalls = [0.0] + list(recalls) + [1.0]
    
    # Make precision monotonically decreasing
    for i in range(len(precisions) - 2, -1, -1):
        precisions[i] = max(precisions[i], precisions[i + 1])
    
    # Calculate AP using 11-point interpolation or all-point
    ap = 0.0
    for i in range(1, len(recalls)):
        if recalls[i] != recalls[i - 1]:
            ap += (recalls[i] - recalls[i - 1]) * precisions[i]
    
    return ap


def evaluate_detection(
    predictions: List[Dict],
    ground_truths: List[Dict],
    iou_threshold: float = 0.5,
) -> Dict:
    """
    Evaluate detection performance.
    
    Args:
        predictions: List of prediction dicts with 'box' and 'confidence'
        ground_truths: List of ground truth dicts with 'box'
        iou_threshold: IoU threshold for matching
        
    Returns:
        Dictionary with precision, recall, and AP
    """
    if not predictions and not ground_truths:
        return {'precision': 1.0, 'recall': 1.0, 'ap': 1.0, 'f1': 1.0}
    
    if not predictions:
        return {'precision': 0.0, 'recall': 0.0, 'ap': 0.0, 'f1': 0.0}
    
    if not ground_truths:
        return {'precision': 0.0, 'recall': 0.0, 'ap': 0.0, 'f1': 0.0}
    
    # Sort predictions by confidence
    sorted_preds = sorted(predictions, key=lambda x: x.get('confidence', 0), reverse=True)
    
    num_gt = len(ground_truths)
    gt_matched = [False] * num_gt
    
    tp = []
    fp = []
    
    for pred in sorted_preds:
        pred_box = pred['box']
        
        # Find best matching ground truth
        best_iou = 0.0
        best_gt_idx = -1
        
        for gt_idx, gt in enumerate(ground_truths):
            if gt_matched[gt_idx]:
                continue
            
            iou = calculate_iou(pred_box, gt['box'])
            if iou > best_iou:
                best_iou = iou
                best_gt_idx = gt_idx
        
        if best_iou >= iou_threshold:
            tp.append(1)
            fp.append(0)
            gt_matched[best_gt_idx] = True
        else:
            tp.append(0)
            fp.append(1)
    
    # Cumulative sums
    tp_cumsum = np.cumsum(tp)
    fp_cumsum = np.cumsum(fp)
    
    # Precision and recall at each threshold
    precisions = tp_cumsum / (tp_cumsum + fp_cumsum)
    recalls = tp_cumsum / num_gt
    
    # Calculate AP
    ap = calculate_ap(precisions.tolist(), recalls.tolist())
    
    # Final precision and recall
    final_precision = precisions[-1] if len(precisions) > 0 else 0.0
    final_recall = recalls[-1] if len(recalls) > 0 else 0.0
    
    # F1 score
    f1 = 2 * final_precision * final_recall / (final_precision + final_recall) \
         if (final_precision + final_recall) > 0 else 0.0
    
    return {
        'precision': float(final_precision),
        'recall': float(final_recall),
        'ap': float(ap),
        'f1': float(f1),
        'num_predictions': len(predictions),
        'num_ground_truths': num_gt,
        'true_positives': int(sum(tp)),
        'false_positives': int(sum(fp)),
        'false_negatives': num_gt - int(sum(tp)),
    }


def calculate_map(
    all_predictions: List[List[Dict]],
    all_ground_truths: List[List[Dict]],
    iou_thresholds: List[float] = None,
) -> Dict:
    """
    Calculate mAP across multiple IoU thresholds.
    
    Args:
        all_predictions: List of prediction lists (one per image)
        all_ground_truths: List of ground truth lists (one per image)
        iou_thresholds: List of IoU thresholds (default: 0.5:0.95:0.05)
        
    Returns:
        Dictionary with mAP@0.5, mAP@0.5:0.95, etc.
    """
    if iou_thresholds is None:
        iou_thresholds = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95]
    
    # Combine all predictions and ground truths
    all_preds = []
    all_gts = []
    
    for preds in all_predictions:
        all_preds.extend(preds)
    for gts in all_ground_truths:
        all_gts.extend(gts)
    
    # Calculate AP at each threshold
    aps = {}
    for iou_thresh in iou_thresholds:
        result = evaluate_detection(all_preds, all_gts, iou_thresh)
        aps[f'AP@{iou_thresh:.2f}'] = result['ap']
    
    # mAP@0.5
    map_50 = aps.get('AP@0.50', 0.0)
    
    # mAP@0.5:0.95 (COCO-style)
    map_50_95 = np.mean([aps[f'AP@{t:.2f}'] for t in iou_thresholds])
    
    return {
        'mAP@0.5': float(map_50),
        'mAP@0.5:0.95': float(map_50_95),
        'AP_per_threshold': aps,
    }


def calculate_cer(prediction: str, ground_truth: str) -> float:
    """
    Calculate Character Error Rate.
    
    CER = (S + D + I) / N
    where S = substitutions, D = deletions, I = insertions, N = length of ground truth
    """
    import editdistance
    
    if not ground_truth:
        return 0.0 if not prediction else 1.0
    
    distance = editdistance.eval(prediction, ground_truth)
    return distance / len(ground_truth)


def calculate_wer(prediction: str, ground_truth: str) -> float:
    """
    Calculate Word Error Rate.
    
    WER = (S + D + I) / N
    where S = substitutions, D = deletions, I = insertions, N = number of words in ground truth
    """
    try:
        from jiwer import wer
        return wer(ground_truth, prediction)
    except:
        # Fallback implementation
        import editdistance
        
        pred_words = prediction.split()
        gt_words = ground_truth.split()
        
        if not gt_words:
            return 0.0 if not pred_words else 1.0
        
        distance = editdistance.eval(pred_words, gt_words)
        return distance / len(gt_words)


def evaluate_ocr(
    predictions: List[str],
    ground_truths: List[str],
) -> Dict:
    """
    Evaluate OCR performance.
    
    Args:
        predictions: List of predicted text strings
        ground_truths: List of ground truth text strings
        
    Returns:
        Dictionary with CER and WER metrics
    """
    if len(predictions) != len(ground_truths):
        raise ValueError("Predictions and ground truths must have same length")
    
    if not predictions:
        return {'CER': 0.0, 'WER': 0.0, 'num_samples': 0}
    
    cers = []
    wers = []
    
    for pred, gt in zip(predictions, ground_truths):
        cers.append(calculate_cer(pred, gt))
        wers.append(calculate_wer(pred, gt))
    
    return {
        'CER': float(np.mean(cers)),
        'CER_std': float(np.std(cers)),
        'WER': float(np.mean(wers)),
        'WER_std': float(np.std(wers)),
        'num_samples': len(predictions),
        'per_sample': [
            {'CER': c, 'WER': w, 'prediction': p, 'ground_truth': g}
            for c, w, p, g in zip(cers, wers, predictions, ground_truths)
        ]
    }


def load_yolo_labels(label_dir: Path) -> Dict[str, List[Dict]]:
    """Load YOLO format ground truth labels."""
    labels = {}
    
    for label_file in label_dir.glob('*.txt'):
        image_name = label_file.stem
        boxes = []
        
        with open(label_file, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) == 5:
                    cls, x_center, y_center, w, h = map(float, parts)
                    # Convert to x1, y1, x2, y2 (assuming 640x640 for now)
                    # This is a simplification - in practice you'd need image dimensions
                    boxes.append({
                        'box': [x_center - w/2, y_center - h/2, 
                               x_center + w/2, y_center + h/2],
                        'class': int(cls),
                    })
        
        labels[image_name] = boxes
    
    return labels


def evaluate_from_files(
    predictions_dir: Path,
    ground_truth_dir: Path,
) -> Dict:
    """
    Evaluate detection and OCR from JSON files.
    
    Expects:
    - predictions_dir: Directory with detection JSON files
    - ground_truth_dir: Directory with ground truth labels (YOLO format)
    """
    results = {
        'detection': {},
        'ocr': {},
    }
    
    # Load predictions
    all_preds = []
    all_gts = []
    ocr_preds = []
    ocr_gts = []
    
    gt_labels = load_yolo_labels(ground_truth_dir)
    
    for json_file in predictions_dir.glob('*.json'):
        with open(json_file, 'r') as f:
            pred_data = json.load(f)
        
        image_name = json_file.stem
        
        # Detection evaluation
        if image_name in gt_labels:
            preds = pred_data.get('detections', [])
            gts = gt_labels[image_name]
            
            all_preds.append(preds)
            all_gts.append(gts)
        
        # OCR evaluation (if ground truth text available)
        for det in pred_data.get('detections', []):
            if 'ocr_text' in det and 'ground_truth_text' in det:
                ocr_preds.append(det['ocr_text'])
                ocr_gts.append(det['ground_truth_text'])
    
    # Calculate detection metrics
    if all_preds and all_gts:
        results['detection'] = calculate_map(all_preds, all_gts)
    
    # Calculate OCR metrics
    if ocr_preds and ocr_gts:
        results['ocr'] = evaluate_ocr(ocr_preds, ocr_gts)
    
    return results


def print_results(results: Dict):
    """Print evaluation results in a formatted way."""
    print("\n" + "="*60)
    print(" EVALUATION RESULTS")
    print("="*60)
    
    if 'detection' in results and results['detection']:
        print("\n📦 Detection Metrics:")
        det = results['detection']
        print(f"   mAP@0.5:      {det.get('mAP@0.5', 0):.4f}")
        print(f"   mAP@0.5:0.95: {det.get('mAP@0.5:0.95', 0):.4f}")
        
        if 'AP_per_threshold' in det:
            print("\n   AP per IoU threshold:")
            for thresh, ap in det['AP_per_threshold'].items():
                print(f"     {thresh}: {ap:.4f}")
    
    if 'ocr' in results and results['ocr']:
        print("\n📝 OCR Metrics:")
        ocr = results['ocr']
        print(f"   CER: {ocr.get('CER', 0):.4f} (±{ocr.get('CER_std', 0):.4f})")
        print(f"   WER: {ocr.get('WER', 0):.4f} (±{ocr.get('WER_std', 0):.4f})")
        print(f"   Samples: {ocr.get('num_samples', 0)}")
    
    print("\n" + "="*60)
    
    # Expected ranges
    print("\n📊 Expected Ranges (for reference):")
    print("   Detection mAP@0.5: 85-95% (good), 75-85% (acceptable)")
    print("   OCR CER: 5-10% (good), 10-20% (acceptable)")
    print("   OCR WER: 15-25% (good), 25-40% (acceptable)")
    print("   Note: Handwriting is harder than printed text")


def main():
    parser = argparse.ArgumentParser(
        description='Evaluate detection and OCR performance',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Input options
    parser.add_argument('--predictions', '-p', type=str,
                       help='Path to predictions directory (JSON files)')
    parser.add_argument('--ground-truth', '-g', type=str,
                       help='Path to ground truth directory (YOLO labels)')
    
    # Direct OCR evaluation
    parser.add_argument('--ocr-pred', type=str,
                       help='Path to OCR predictions JSON')
    parser.add_argument('--ocr-gt', type=str,
                       help='Path to OCR ground truth JSON')
    
    # Output
    parser.add_argument('--output', '-o', type=str, default=None,
                       help='Output JSON file for results')
    
    # Quick test with sample data
    parser.add_argument('--demo', action='store_true',
                       help='Run demo evaluation with sample data')
    
    args = parser.parse_args()
    
    if args.demo:
        # Demo with synthetic data
        print("Running demo evaluation...")
        
        # Sample detection data
        predictions = [
            {'box': [10, 10, 100, 50], 'confidence': 0.9},
            {'box': [120, 10, 200, 50], 'confidence': 0.85},
            {'box': [10, 60, 150, 100], 'confidence': 0.7},
        ]
        
        ground_truths = [
            {'box': [12, 8, 98, 52]},
            {'box': [118, 12, 198, 48]},
            {'box': [8, 58, 148, 102]},
        ]
        
        det_results = evaluate_detection(predictions, ground_truths, iou_threshold=0.5)
        print("\nSingle image detection results:")
        for k, v in det_results.items():
            print(f"  {k}: {v}")
        
        # Sample OCR data
        ocr_predictions = [
            "Hello World",
            "This is a test",
            "Handwriting OCR",
        ]
        
        ocr_ground_truths = [
            "Hello World",
            "This is a test",
            "Handwriting OCR",
        ]
        
        ocr_results = evaluate_ocr(ocr_predictions, ocr_ground_truths)
        print("\nOCR results:")
        print(f"  CER: {ocr_results['CER']:.4f}")
        print(f"  WER: {ocr_results['WER']:.4f}")
        
        # With some errors
        ocr_predictions_err = [
            "Hello Warld",  # 1 char error
            "This is o test",  # 1 char error
            "Handwritng OCR",  # 1 char error
        ]
        
        ocr_results_err = evaluate_ocr(ocr_predictions_err, ocr_ground_truths)
        print("\nOCR results (with errors):")
        print(f"  CER: {ocr_results_err['CER']:.4f}")
        print(f"  WER: {ocr_results_err['WER']:.4f}")
        
        return
    
    results = {}
    
    # File-based evaluation
    if args.predictions and args.ground_truth:
        pred_dir = Path(args.predictions)
        gt_dir = Path(args.ground_truth)
        
        if not pred_dir.exists():
            print(f"❌ Predictions directory not found: {pred_dir}")
            sys.exit(1)
        
        if not gt_dir.exists():
            print(f"❌ Ground truth directory not found: {gt_dir}")
            sys.exit(1)
        
        results = evaluate_from_files(pred_dir, gt_dir)
    
    # Direct OCR evaluation
    if args.ocr_pred and args.ocr_gt:
        with open(args.ocr_pred, 'r') as f:
            ocr_pred_data = json.load(f)
        with open(args.ocr_gt, 'r') as f:
            ocr_gt_data = json.load(f)
        
        # Assuming lists of text strings
        results['ocr'] = evaluate_ocr(ocr_pred_data, ocr_gt_data)
    
    # Print results
    print_results(results)
    
    # Save results
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n✅ Results saved to: {output_path}")


if __name__ == "__main__":
    main()
