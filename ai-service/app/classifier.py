"""Fine-tuned genuine vs stock_or_reused image classifier (Stage C).

The checkpoint is optional. When it is missing the service stays in bootstrap mode and the
classifier weight is redistributed to the other signals.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

logger = logging.getLogger(__name__)

CLASSES = ["genuine", "stock_or_reused"]
BACKBONE_DIMS = {"efficientnet_b0": 1280, "resnet18": 512, "resnet50": 2048}


def build_classifier(backbone: str, num_classes: int = 2, pretrained: bool = False) -> nn.Module:
    if backbone == "efficientnet_b0":
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        model = models.efficientnet_b0(weights=weights)
        model.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(BACKBONE_DIMS[backbone], num_classes))
    elif backbone == "resnet18":
        weights = models.ResNet18_Weights.DEFAULT if pretrained else None
        model = models.resnet18(weights=weights)
        model.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(BACKBONE_DIMS[backbone], num_classes))
    elif backbone == "resnet50":
        weights = models.ResNet50_Weights.DEFAULT if pretrained else None
        model = models.resnet50(weights=weights)
        model.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(BACKBONE_DIMS[backbone], num_classes))
    else:
        raise ValueError(f"Unsupported backbone {backbone}")
    return model


class StockPhotoClassifier:
    def __init__(self, checkpoint_path: Path, meta_path: Path, device: str = "cpu") -> None:
        self.checkpoint_path = Path(checkpoint_path)
        self.meta_path = Path(meta_path)
        self.device = torch.device(device if torch.cuda.is_available() and device != "cpu" else "cpu")
        self.model: nn.Module | None = None
        self.backbone = "efficientnet_b0"
        self.version = "unavailable"
        self.metrics: dict = {}
        self._transform = transforms.Compose(
            [
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    @property
    def available(self) -> bool:
        return self.model is not None

    def load(self) -> bool:
        if not self.checkpoint_path.exists():
            return False
        try:
            checkpoint = torch.load(self.checkpoint_path, map_location="cpu", weights_only=False)
            self.backbone = checkpoint.get("backbone", "efficientnet_b0")
            self.version = checkpoint.get("model_version", "trained-v1")
            self.model = build_classifier(self.backbone, num_classes=2, pretrained=False)
            self.model.load_state_dict(checkpoint["state_dict"])
            self.model.eval().to(self.device)
            if self.meta_path.exists():
                self.metrics = json.loads(self.meta_path.read_text())
            logger.info("Loaded trained classifier %s (%s)", self.version, self.backbone)
            return True
        except Exception as exc:
            logger.error("Failed to load classifier checkpoint: %s", exc)
            self.model = None
            return False

    def predict_stock_probability(self, images: list[Image.Image]) -> float | None:
        if not images or self.model is None:
            return None
        tensor = torch.stack([self._transform(image.convert("RGB")) for image in images]).to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            probabilities = torch.softmax(logits, dim=1)[:, 1]
        return float(probabilities.mean().item())

    def predict_one(self, image: Image.Image) -> dict[str, float]:
        if self.model is None:
            return {}
        tensor = self._transform(image.convert("RGB")).unsqueeze(0).to(self.device)
        with torch.no_grad():
            probabilities = torch.softmax(self.model(tensor), dim=1)[0].cpu().numpy()
        return {name: float(probabilities[i]) for i, name in enumerate(CLASSES)}
