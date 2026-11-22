#!/usr/bin/env python3
"""Fine-tune the genuine vs stock_or_reused image classifier.

Designed for small datasets and CPU-only laptops:
  * frozen backbone linear probe first, then unfreeze the last block
  * strong augmentation, class weights, early stopping
  * optional stratified k-fold cross-validation

Usage:
  python train.py --data-dir ../dataset --epochs 12 --backbone efficientnet_b0
  python train.py --data-dir ../dataset --cv 5
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from sklearn.model_selection import StratifiedKFold
from torch.utils.data import DataLoader, Dataset, Subset

from app.classifier import build_classifier
from app.config import BASE_DIR
from app.training import (
    build_transforms,
    compute_class_weights,
    compute_metrics,
    freeze_backbone,
    make_dataset,
    make_loader,
    predict_loader,
    train_one_epoch,
    unfreeze_last_block,
)

CLASSES = ["genuine", "stock_or_reused"]


class FolderListDataset(Dataset):
    """Image list with a configurable transform (used for cross-validation)."""

    def __init__(self, samples: list[tuple[str, int]], transform) -> None:
        self.samples = samples
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int):
        path, label = self.samples[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), label


def collect_samples(root: Path, splits: list[str]) -> list[tuple[str, int]]:
    samples: list[tuple[str, int]] = []
    for split in splits:
        dataset = make_dataset(root, split, train=False)
        class_to_idx = dataset.class_to_idx
        for path, label in dataset.samples:
            samples.append((path, class_to_idx[dataset.classes[label]]))
    return samples


def warn_small_classes(dataset) -> None:
    counts = {name: 0 for name in dataset.classes}
    for _, label in dataset.samples:
        counts[dataset.classes[label]] += 1
    print("Class counts:")
    for name, count in counts.items():
        print(f"  {name:>16}: {count}")
        if count < 100:
            print(f"  WARNING: '{name}' has only {count} images. Aim for 300-500 (ideally 500-1000) per class.")
    if len(counts) != 2:
        raise SystemExit(f"Expected exactly two class folders (genuine, stock_or_reused), found {sorted(counts)}")


def run_epochs(
    model,
    train_loader,
    val_loader,
    backbone: str,
    epochs: int,
    freeze_epochs: int,
    lr: float,
    class_weights: torch.Tensor,
    device: torch.device,
    patience: int = 3,
) -> tuple[dict, dict]:
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
    best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
    best_score = -1.0
    best_metrics: dict = {}
    stale = 0

    for epoch in range(epochs):
        if epoch < freeze_epochs:
            freeze_backbone(model, backbone)
            optimizer = torch.optim.AdamW(
                [p for p in model.parameters() if p.requires_grad], lr=lr, weight_decay=1e-4
            )
        else:
            if epoch == freeze_epochs:
                unfreeze_last_block(model, backbone)
                head = model.classifier if backbone == "efficientnet_b0" else model.fc
                optimizer = torch.optim.AdamW(
                    [
                        {"params": [p for p in model.parameters() if p.requires_grad and not any(p is h for h in head.parameters())], "lr": lr / 10},
                        {"params": list(head.parameters()), "lr": lr / 2},
                    ],
                    weight_decay=1e-4,
                )
        train_loss = train_one_epoch(model, train_loader, optimizer, criterion, device)
        probabilities, labels = predict_loader(model, val_loader, device)
        metrics = compute_metrics(probabilities, labels)
        val_loss = float(-np.mean(labels * np.log(probabilities + 1e-9) + (1 - labels) * np.log(1 - probabilities + 1e-9)))
        score = metrics.get("f1", 0.0) if len(set(labels.tolist())) > 1 else -val_loss
        print(
            f"epoch {epoch + 1:02d}/{epochs} | train loss {train_loss:.4f} | val loss {val_loss:.4f} "
            f"| val F1 {metrics.get('f1', 0):.3f} | val acc {metrics.get('accuracy', 0):.3f}"
        )
        if score > best_score:
            best_score = score
            best_metrics = metrics
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
            stale = 0
        else:
            stale += 1
            if stale >= patience:
                print(f"Early stopping at epoch {epoch + 1} (no improvement for {patience} epochs).")
                break

    model.load_state_dict(best_state)
    return best_state, best_metrics


def train_final(args, device: torch.device) -> dict:
    root = Path(args.data_dir)
    train_dataset = make_dataset(root, "train", train=True)
    val_dataset = make_dataset(root, "val", train=False)
    warn_small_classes(train_dataset)

    class_weights = compute_class_weights(train_dataset)
    train_loader = make_loader(train_dataset, args.batch_size, shuffle=True)
    val_loader = make_loader(val_dataset, args.batch_size)

    model = build_classifier(args.backbone, num_classes=2, pretrained=True).to(device)
    _, val_metrics = run_epochs(
        model,
        train_loader,
        val_loader,
        args.backbone,
        args.epochs,
        args.freeze_epochs,
        args.lr,
        class_weights,
        device,
        args.patience,
    )

    test_metrics = {}
    if (root / "test").exists():
        test_dataset = make_dataset(root, "test", train=False)
        if len(test_dataset) > 0:
            probabilities, labels = predict_loader(model, make_loader(test_dataset, args.batch_size), device)
            test_metrics = compute_metrics(probabilities, labels)
            print("Test metrics:", json.dumps(test_metrics))

    version = f"image-cnn-{args.backbone}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    checkpoint = {
        "state_dict": model.state_dict(),
        "backbone": args.backbone,
        "classes": CLASSES,
        "model_version": version,
        "metrics": {"validation": val_metrics, "test": test_metrics},
        "threshold": 0.5,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    model_dir = Path(args.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    torch.save(checkpoint, model_dir / "image_cnn.pt")
    (model_dir / "image_cnn_meta.json").write_text(json.dumps(checkpoint["metrics"], indent=2))
    return {"version": version, "validation": val_metrics, "test": test_metrics}


def cross_validate(args, device: torch.device) -> dict:
    root = Path(args.data_dir)
    samples = collect_samples(root, ["train", "val"])
    labels = np.array([label for _, label in samples])
    folds = StratifiedKFold(n_splits=args.cv, shuffle=True, random_state=42)
    scores: list[dict] = []

    for fold, (train_idx, val_idx) in enumerate(folds.split(np.zeros(len(labels)), labels), start=1):
        print(f"\n=== Fold {fold}/{args.cv} ===")
        train_ds = FolderListDataset([samples[i] for i in train_idx], build_transforms(train=True))
        val_ds = FolderListDataset([samples[i] for i in val_idx], build_transforms(train=False))
        weights = torch.tensor(
            np.clip(np.bincount(labels[train_idx], minlength=2), 1, None).astype(float), dtype=torch.float32
        )
        weights = weights.sum() / (2 * weights)
        model = build_classifier(args.backbone, num_classes=2, pretrained=True).to(device)
        _, metrics = run_epochs(
            model,
            DataLoader(train_ds, batch_size=args.batch_size, shuffle=True),
            DataLoader(val_ds, batch_size=args.batch_size),
            args.backbone,
            args.epochs,
            args.freeze_epochs,
            args.lr,
            weights,
            device,
            args.patience,
        )
        scores.append(metrics)

    summary = {
        "folds": scores,
        "meanF1": round(float(np.mean([s.get("f1", 0) for s in scores])), 4),
        "meanAccuracy": round(float(np.mean([s.get("accuracy", 0) for s in scores])), 4),
    }
    print("\nCross-validation summary:", json.dumps(summary, indent=2))
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Train RentSaathi image fraud classifier")
    parser.add_argument("--data-dir", default=str(BASE_DIR.parent / "dataset"))
    parser.add_argument("--model-dir", default=str(BASE_DIR / "models"))
    parser.add_argument("--backbone", default="efficientnet_b0", choices=["efficientnet_b0", "resnet18", "resnet50"])
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--freeze-epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--cv", type=int, default=0, help="Optional stratified k-fold cross-validation (e.g. 5)")
    parser.add_argument("--device", default="cpu")
    args = parser.parse_args()

    device = torch.device(args.device if torch.cuda.is_available() and args.device != "cpu" else "cpu")
    root = Path(args.data_dir)
    if not (root / "train").exists():
        print(
            f"ERROR: {root / 'train'} not found.\n"
            "Collect photos first, then run:\n"
            "  python ../dataset-tools/organize_dataset.py\n"
            "  python ../dataset-tools/augment_duplicates.py\n"
            "See ../dataset-tools/download_helper.md for the collection plan.",
            file=sys.stderr,
        )
        return 1

    started = time.time()
    result = train_final(args, device)
    if args.cv > 1:
        result["crossValidation"] = cross_validate(args, device)
    result["trainedInSeconds"] = round(time.time() - started, 1)
    print(json.dumps(result, indent=2))
    print(f"\nSaved {Path(args.model_dir) / 'image_cnn.pt'}. Set AI_MODE=trained (or keep auto) and restart the service.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
