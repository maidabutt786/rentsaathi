"""Shared training/evaluation helpers for the image classifier."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def build_transforms(train: bool) -> transforms.Compose:
    if train:
        return transforms.Compose(
            [
                transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomRotation(8),
                transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.2, hue=0.02),
                transforms.RandomApply([transforms.GaussianBlur(3)], p=0.15),
                transforms.ToTensor(),
                transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
                transforms.RandomErasing(p=0.15, scale=(0.02, 0.1)),
            ]
        )
    return transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )


def make_dataset(root: Path, split: str, train: bool) -> datasets.ImageFolder:
    path = Path(root) / split
    if not path.exists():
        raise FileNotFoundError(f"Dataset split not found: {path}")
    return datasets.ImageFolder(str(path), transform=build_transforms(train))


def make_loader(dataset, batch_size: int = 16, shuffle: bool = False, num_workers: int = 0) -> DataLoader:
    return DataLoader(dataset, batch_size=batch_size, shuffle=shuffle, num_workers=num_workers)


def compute_class_weights(dataset: datasets.ImageFolder) -> torch.Tensor:
    counts = np.bincount([label for _, label in dataset.samples], minlength=len(dataset.classes)).astype(float)
    counts = np.clip(counts, 1.0, None)
    weights = counts.sum() / (len(counts) * counts)
    return torch.tensor(weights, dtype=torch.float32)


def unfreeze_last_block(model: nn.Module, backbone: str) -> None:
    for parameter in model.parameters():
        parameter.requires_grad = False
    head = model.classifier if backbone == "efficientnet_b0" else model.fc
    for parameter in head.parameters():
        parameter.requires_grad = True
    if backbone == "efficientnet_b0":
        for parameter in model.features[-1].parameters():
            parameter.requires_grad = True
    else:
        for parameter in model.layer4.parameters():
            parameter.requires_grad = True


def freeze_backbone(model: nn.Module, backbone: str) -> None:
    for parameter in model.parameters():
        parameter.requires_grad = False
    head = model.classifier if backbone == "efficientnet_b0" else model.fc
    for parameter in head.parameters():
        parameter.requires_grad = True


def train_one_epoch(model, loader, optimizer, criterion, device) -> float:
    model.train()
    total_loss = 0.0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * images.size(0)
    return total_loss / max(1, len(loader.dataset))


@torch.no_grad()
def predict_loader(model, loader, device) -> tuple[np.ndarray, np.ndarray]:
    model.eval()
    probabilities: list[float] = []
    labels_out: list[int] = []
    for images, labels in loader:
        logits = model(images.to(device))
        probs = torch.softmax(logits, dim=1)[:, 1]
        probabilities.extend(probs.cpu().numpy().tolist())
        labels_out.extend(labels.numpy().tolist())
    return np.array(probabilities), np.array(labels_out)


def compute_metrics(probabilities: np.ndarray, labels: np.ndarray, threshold: float = 0.5) -> dict:
    if len(labels) == 0:
        return {"samples": 0}
    predictions = (probabilities >= threshold).astype(int)
    metrics: dict = {
        "samples": int(len(labels)),
        "accuracy": round(float(accuracy_score(labels, predictions)), 4),
        "precision": round(float(precision_score(labels, predictions, zero_division=0)), 4),
        "recall": round(float(recall_score(labels, predictions, zero_division=0)), 4),
        "f1": round(float(f1_score(labels, predictions, zero_division=0)), 4),
        "confusionMatrix": confusion_matrix(labels, predictions, labels=[0, 1]).tolist(),
        "threshold": threshold,
    }
    if len(set(labels.tolist())) > 1:
        metrics["rocAuc"] = round(float(roc_auc_score(labels, probabilities)), 4)
    else:
        metrics["rocAuc"] = None
    return metrics
