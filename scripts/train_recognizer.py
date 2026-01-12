"""
TMNIST Dataset Loader and Training Script for Character Recognition

This script:
1. Loads the TMNIST 94-character dataset from CSV
2. Creates PyTorch DataLoader with proper preprocessing
3. Trains a CNN model for character recognition
4. Saves the best model checkpoint

Usage:
    python train_recognizer.py --data data/tmnist/94_character_TMNIST.csv --epochs 50
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import Tuple, Optional

import numpy as np
import pandas as pd
from tqdm import tqdm

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
import torchvision.transforms as T

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from handwriting_ocr.app.models.recognizer import (
    get_model_class,
    TMNIST_CHARACTERS,
    CHAR_TO_IDX,
    NUM_CLASSES,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class TMNISTDataset(Dataset):
    """
    PyTorch Dataset for TMNIST 94-character dataset.

    The CSV format:
    - Column 'names': Font name
    - Column 'labels': Character label (single char)
    - Columns '1' to '784': Pixel values (28x28 = 784)
    """

    def __init__(
        self,
        csv_path: str,
        transform: Optional[T.Compose] = None,
        max_samples: Optional[int] = None,
    ):
        """
        Initialize the dataset.

        Args:
            csv_path: Path to TMNIST CSV file
            transform: Optional transforms to apply
            max_samples: Limit number of samples (for debugging)
        """
        logger.info(f"Loading TMNIST dataset from {csv_path}...")

        # Load CSV
        if max_samples:
            self.df = pd.read_csv(csv_path, nrows=max_samples)
        else:
            self.df = pd.read_csv(csv_path)

        logger.info(f"Loaded {len(self.df)} samples")

        # Extract labels and pixel data
        self.labels = self.df["labels"].values
        self.pixel_cols = [str(i) for i in range(1, 785)]
        self.pixels = self.df[self.pixel_cols].values.astype(np.float32)

        # Setup transform
        self.transform = transform

        # Create label to index mapping
        self.label_to_idx = CHAR_TO_IDX

        # Validate labels
        unique_labels = set(self.labels)
        known_labels = set(TMNIST_CHARACTERS)
        unknown = unique_labels - known_labels
        if unknown:
            logger.warning(f"Found {len(unknown)} unknown labels: {unknown}")

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        # Get pixel values and reshape to 28x28
        pixels = self.pixels[idx].reshape(28, 28)

        # Normalize to [0, 1]
        pixels = pixels / 255.0

        # Convert to tensor (C, H, W)
        image = torch.tensor(pixels, dtype=torch.float32).unsqueeze(0)

        # Apply transforms if any
        if self.transform:
            # Convert to PIL for transforms, then back
            from PIL import Image

            img_pil = Image.fromarray((pixels * 255).astype(np.uint8), mode="L")
            image = self.transform(img_pil)

        # Get label index
        label = self.labels[idx]
        label_idx = self.label_to_idx.get(label, 0)

        return image, label_idx


def get_transforms(train: bool = True) -> T.Compose:
    """Get transforms for training or validation."""
    if train:
        return T.Compose(
            [
                T.RandomRotation(10),
                T.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
                T.ToTensor(),
                T.Normalize(mean=[0.5], std=[0.5]),
            ]
        )
    else:
        return T.Compose(
            [
                T.ToTensor(),
                T.Normalize(mean=[0.5], std=[0.5]),
            ]
        )


def train_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    device: str,
) -> Tuple[float, float]:
    """Train for one epoch."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    pbar = tqdm(loader, desc="Training", leave=False)
    for images, labels in pbar:
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        correct += predicted.eq(labels).sum().item()
        total += labels.size(0)

        pbar.set_postfix({"loss": f"{loss.item():.4f}", "acc": f"{100.0 * correct / total:.2f}%"})

    avg_loss = total_loss / total
    accuracy = 100.0 * correct / total
    return avg_loss, accuracy


def validate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: str,
) -> Tuple[float, float]:
    """Validate the model."""
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in tqdm(loader, desc="Validating", leave=False):
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            total_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            correct += predicted.eq(labels).sum().item()
            total += labels.size(0)

    avg_loss = total_loss / total
    accuracy = 100.0 * correct / total
    return avg_loss, accuracy


def main():
    parser = argparse.ArgumentParser(description="Train character recognizer on TMNIST")
    parser.add_argument(
        "--data",
        "-d",
        type=str,
        default="data/tmnist/94_character_TMNIST.csv",
        help="Path to TMNIST CSV file",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="models/recognizer",
        help="Output directory for model checkpoints",
    )
    parser.add_argument("--epochs", type=int, default=50, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=128, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--weight-decay", type=float, default=1e-4, help="Weight decay")
    parser.add_argument("--val-split", type=float, default=0.1, help="Validation split")
    parser.add_argument("--device", type=str, default="cuda", help="Device (cuda/cpu)")
    parser.add_argument("--max-samples", type=int, default=None, help="Limit samples (debug)")
    parser.add_argument("--patience", type=int, default=10, help="Early stopping patience")

    args = parser.parse_args()

    # Setup device
    if args.device == "cuda" and not torch.cuda.is_available():
        logger.warning("CUDA not available, using CPU")
        args.device = "cpu"

    device = torch.device(args.device)
    logger.info(f"Using device: {device}")

    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load dataset
    full_dataset = TMNISTDataset(
        csv_path=args.data,
        transform=None,  # We'll apply transforms per split
        max_samples=args.max_samples,
    )

    # Split into train/val
    val_size = int(len(full_dataset) * args.val_split)
    train_size = len(full_dataset) - val_size
    train_dataset, val_dataset = random_split(
        full_dataset, [train_size, val_size], generator=torch.Generator().manual_seed(42)
    )

    logger.info(f"Train samples: {len(train_dataset)}")
    logger.info(f"Val samples: {len(val_dataset)}")

    # Create data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=4,
        pin_memory=True,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=4,
        pin_memory=True,
    )

    # Create model
    CharacterCNN = get_model_class()
    model = CharacterCNN(num_classes=NUM_CLASSES, dropout=0.3)
    model = model.to(device)

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    logger.info(f"Model parameters: {total_params:,} (trainable: {trainable_params:,})")

    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(
        model.parameters(),
        lr=args.lr,
        weight_decay=args.weight_decay,
    )
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=args.epochs,
        eta_min=1e-6,
    )

    # Training loop
    best_val_acc = 0.0
    patience_counter = 0

    logger.info("Starting training...")
    print("=" * 60)

    for epoch in range(1, args.epochs + 1):
        print(f"\nEpoch {epoch}/{args.epochs}")
        print("-" * 40)

        # Train
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, device)

        # Validate
        val_loss, val_acc = validate(model, val_loader, criterion, device)

        # Update scheduler
        scheduler.step()
        current_lr = scheduler.get_last_lr()[0]

        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        print(f"Val Loss:   {val_loss:.4f} | Val Acc:   {val_acc:.2f}%")
        print(f"LR: {current_lr:.6f}")

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0

            # Save checkpoint
            checkpoint_path = output_dir / "best.pt"
            torch.save(model.state_dict(), checkpoint_path)
            logger.info(f"Saved best model with val acc: {val_acc:.2f}%")

            # Also save full checkpoint for resume
            full_checkpoint = {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "scheduler_state_dict": scheduler.state_dict(),
                "val_acc": val_acc,
                "val_loss": val_loss,
            }
            torch.save(full_checkpoint, output_dir / "checkpoint.pt")
        else:
            patience_counter += 1
            if patience_counter >= args.patience:
                logger.info(f"Early stopping after {epoch} epochs")
                break

    # Save final model
    torch.save(model.state_dict(), output_dir / "final.pt")

    print("\n" + "=" * 60)
    print(f"Training complete!")
    print(f"Best validation accuracy: {best_val_acc:.2f}%")
    print(f"Model saved to: {output_dir}")
    print("=" * 60)

    # Save training info
    info = {
        "num_classes": NUM_CLASSES,
        "characters": TMNIST_CHARACTERS,
        "best_val_acc": best_val_acc,
        "epochs_trained": epoch,
        "model_params": total_params,
    }

    import json

    with open(output_dir / "training_info.json", "w") as f:
        json.dump(info, f, indent=2)


if __name__ == "__main__":
    main()
