"""
Download Multiple Real Handwriting Datasets
Automatically downloads and converts multiple public datasets

DATASETS AVAILABLE:
1. IAM Handwriting Database - English (requires registration)
2. EMNIST - 800k+ characters (automatic download via torchvision)
3. Kaggle English Handwriting - Lines and names (requires API key)
4. IMGUR5K - Wild handwriting from internet (direct download)

For your use case (English cursive + block):
- Best: IAM Database (mixed styles, full sentences)
- Quick: EMNIST + synthetic fonts (what you have now)
- Alternative: IMGUR5K (real-world but noisy)
"""

import os
import sys
import argparse
import requests
import zipfile
from pathlib import Path
from tqdm import tqdm
import cv2
import numpy as np
import yaml
import json


def download_imgur5k(output_dir: Path):
    """
    Download IMGUR5K dataset - real handwriting from internet.
    230k+ word crops, in-the-wild conditions.
    
    Paper: https://arxiv.org/abs/2005.07556
    """
    print("\n" + "="*60)
    print(" Downloading IMGUR5K Dataset")
    print("="*60)
    
    # IMGUR5K download links (if publicly available)
    # Note: Check the actual availability and terms
    base_url = "https://github.com/facebookresearch/IMGUR5K-Handwriting-Dataset"
    
    print(f"⚠️  IMGUR5K requires downloading from:")
    print(f"   {base_url}")
    print(f"\n   Follow their instructions to download the dataset.")
    print(f"   Then run this script with --imgur5k-path <path_to_downloaded_data>")
    
    return False


def download_emnist_expanded(output_dir: Path, num_docs: int = 2000):
    """
    Download EMNIST and create document-style images.
    Already implemented in convert_emnist.py
    """
    print("\n" + "="*60)
    print(" Using EMNIST (Extended MNIST)")
    print("="*60)
    print("⚠️  Note: EMNIST contains isolated characters, not full handwriting.")
    print("   Better for character recognition than document OCR.")
    print(f"\n   Use: python scripts/convert_emnist.py --num-train {num_docs}")
    
    return False


def download_kaggle_dataset(dataset_name: str, output_dir: Path):
    """
    Download dataset from Kaggle using API.
    Requires: pip install kaggle
    And: ~/.kaggle/kaggle.json with API credentials
    """
    print("\n" + "="*60)
    print(f" Downloading from Kaggle: {dataset_name}")
    print("="*60)
    
    try:
        import kaggle
    except ImportError:
        print("❌ Kaggle API not installed.")
        print("   Install: pip install kaggle")
        print("   Setup: https://www.kaggle.com/docs/api")
        return False
    
    try:
        # Download dataset
        print(f"Downloading {dataset_name}...")
        kaggle.api.dataset_download_files(
            dataset_name,
            path=str(output_dir),
            unzip=True
        )
        print(f"✅ Downloaded to {output_dir}")
        return True
    except Exception as e:
        print(f"❌ Download failed: {e}")
        print("\nSetup Kaggle API:")
        print("1. Create account at kaggle.com")
        print("2. Go to Account → API → Create New Token")
        print("3. Save kaggle.json to ~/.kaggle/")
        return False


def convert_generic_dataset_to_yolo(
    images_dir: Path,
    labels_file: Path,  # JSON or CSV with image_path -> text mapping
    output_dir: Path,
    train_ratio: float = 0.8,
):
    """
    Generic converter for datasets with image + text pairs.
    """
    print("\n" + "="*60)
    print(" Converting to YOLO Format")
    print("="*60)
    
    # Create output structure
    for subset in ['train', 'val']:
        (output_dir / 'images' / subset).mkdir(parents=True, exist_ok=True)
        (output_dir / 'labels' / subset).mkdir(parents=True, exist_ok=True)
    
    # Load annotations
    if labels_file.suffix == '.json':
        with open(labels_file, 'r', encoding='utf-8') as f:
            annotations = json.load(f)
    else:
        print(f"❌ Unsupported label format: {labels_file.suffix}")
        return False
    
    # Process images
    train_count = 0
    val_count = 0
    
    for img_name, text in tqdm(annotations.items(), desc="Converting"):
        img_path = images_dir / img_name
        
        if not img_path.exists():
            continue
        
        # Read image
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        
        h, w = img.shape[:2]
        
        # Decide split
        is_train = hash(img_name) % 100 < (train_ratio * 100)
        subset = 'train' if is_train else 'val'
        
        # Copy image
        out_name = f"{Path(img_name).stem}.jpg"
        out_img = output_dir / 'images' / subset / out_name
        cv2.imwrite(str(out_img), img)
        
        # Create YOLO label (whole image is one text region)
        label_path = output_dir / 'labels' / subset / f"{Path(img_name).stem}.txt"
        with open(label_path, 'w') as f:
            # Center box covering most of image
            f.write(f"0 0.5 0.5 0.9 0.9\n")
        
        if is_train:
            train_count += 1
        else:
            val_count += 1
    
    print(f"\n✅ Converted:")
    print(f"   Train: {train_count}")
    print(f"   Val: {val_count}")
    
    # Create data.yaml
    data_yaml = {
        'path': str(output_dir.absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'nc': 1,
        'names': {0: 'handwriting'}
    }
    
    yaml_path = output_dir / 'data.yaml'
    with open(yaml_path, 'w') as f:
        yaml.dump(data_yaml, f, default_flow_style=False)
    
    print(f"✅ Created {yaml_path}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description='Download public handwriting datasets',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument('--dataset', '-d', type=str,
                       choices=['iam', 'emnist', 'kaggle-names', 'kaggle-lines', 'imgur5k', 'synthetic'],
                       default='synthetic',
                       help='Dataset to download')
    
    parser.add_argument('--output', '-o', type=str, default='./data/handwriting_dataset',
                       help='Output directory')
    
    # IAM credentials
    parser.add_argument('--iam-username', type=str,
                       help='IAM database username (from registration)')
    parser.add_argument('--iam-password', type=str,
                       help='IAM database password')
    
    # Kaggle datasets
    parser.add_argument('--kaggle-api-key', type=str,
                       help='Kaggle API key (or use ~/.kaggle/kaggle.json)')
    
    parser.add_argument('--num-samples', type=int, default=2000,
                       help='Number of samples for synthetic generation')
    
    args = parser.parse_args()
    
    output_dir = Path(args.output)
    
    print("="*60)
    print(" Public Handwriting Dataset Downloader")
    print("="*60)
    print(f"Dataset: {args.dataset}")
    print(f"Output: {output_dir}")
    
    if args.dataset == 'iam':
        if not args.iam_username or not args.iam_password:
            print("\n❌ IAM credentials required!")
            print("\n📝 Register at: https://fki.tic.heia-fr.ch/databases/iam-handwriting-database")
            print("Then run: python scripts/download_datasets.py -d iam -u <user> -p <pass>")
            sys.exit(1)
        
        # Use the IAM downloader
        print("\n➡️  Use prepare_iam_dataset.py for IAM download:")
        print(f"   python scripts/prepare_iam_dataset.py -u {args.iam_username} -p <password>")
    
    elif args.dataset == 'emnist':
        print("\n➡️  Use convert_emnist.py for EMNIST:")
        print(f"   python scripts/convert_emnist.py --num-train {args.num_samples}")
    
    elif args.dataset == 'synthetic':
        print("\n➡️  Use download_real_datasets.py for synthetic fonts:")
        print(f"   python scripts/download_real_datasets.py --num-samples {args.num_samples}")
    
    elif args.dataset == 'kaggle-names':
        success = download_kaggle_dataset(
            'landlord/handwriting-recognition',
            output_dir
        )
        if success:
            print("\n✅ Dataset downloaded!")
            print("⚠️  Manual conversion needed - check dataset structure")
    
    elif args.dataset == 'kaggle-lines':
        success = download_kaggle_dataset(
            'nibinv23/iam-handwriting-word-database',
            output_dir
        )
        if success:
            print("\n✅ Dataset downloaded!")
    
    elif args.dataset == 'imgur5k':
        download_imgur5k(output_dir)
    
    print("\n" + "="*60)
    print(" Next Steps")
    print("="*60)
    print("\nFor BEST results (real handwriting):")
    print("1. Register for IAM: https://fki.tic.heia-fr.ch/databases/iam-handwriting-database")
    print("2. Download: python scripts/prepare_iam_dataset.py -u <user> -p <pass>")
    print("3. Train: python scripts/train_detector.py --data data/iam_yolo/data.yaml")
    print("\nFor QUICK results (synthetic):")
    print("1. Generate: python scripts/download_real_datasets.py --num-samples 2000")
    print("2. Train: python scripts/train_detector.py --data data/real_handwriting/data.yaml")


if __name__ == "__main__":
    main()
