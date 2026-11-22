"""Pretrained CNN embeddings used for duplicate / reused-photo detection.

The classification head is removed and every image becomes a single L2-normalised vector.
We never call an external AI API: the backbone runs locally with torchvision weights that are
downloaded once (or baked into the Docker image).
"""
from __future__ import annotations

import logging
from functools import lru_cache

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

logger = logging.getLogger(__name__)

SUPPORTED_BACKBONES = {"efficientnet_b0", "resnet18", "resnet50"}


def _build_backbone(name: str, pretrained: bool) -> tuple[nn.Module, int, bool]:
    """Return (feature extractor, embedding dim, used_pretrained_weights)."""
    if name not in SUPPORTED_BACKBONES:
        raise ValueError(f"Unsupported EMBEDDING_BACKBONE '{name}'. Choose one of {sorted(SUPPORTED_BACKBONES)}")

    used_pretrained = pretrained
    try:
        if name == "efficientnet_b0":
            weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
            model = models.efficientnet_b0(weights=weights)
            model.classifier = nn.Identity()
            dim = 1280
        elif name == "resnet18":
            weights = models.ResNet18_Weights.DEFAULT if pretrained else None
            model = models.resnet18(weights=weights)
            model.fc = nn.Identity()
            dim = 512
        else:  # resnet50
            weights = models.ResNet50_Weights.DEFAULT if pretrained else None
            model = models.resnet50(weights=weights)
            model.fc = nn.Identity()
            dim = 2048
    except Exception as exc:  # network-restricted environment
        if not pretrained:
            raise
        logger.warning("Could not load pretrained %s weights (%s). Falling back to random weights.", name, exc)
        return _build_backbone(name, pretrained=False)

    return model, dim, used_pretrained


class ImageEmbedder:
    """Turns a PIL image into an L2-normalised feature vector."""

    def __init__(self, backbone: str = "efficientnet_b0", pretrained: bool = True, device: str = "cpu") -> None:
        self.backbone = backbone
        self.pretrained = pretrained
        self.device = torch.device(device if torch.cuda.is_available() and device != "cpu" else "cpu")
        self._model: nn.Module | None = None
        self._dim: int | None = None
        self._used_pretrained = False
        self._transform = transforms.Compose(
            [
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    def _ensure_model(self) -> nn.Module:
        if self._model is None:
            model, dim, used_pretrained = _build_backbone(self.backbone, self.pretrained)
            model.eval().to(self.device)
            for parameter in model.parameters():
                parameter.requires_grad = False
            self._model = model
            self._dim = dim
            self._used_pretrained = used_pretrained
        return self._model

    @property
    def embedding_dim(self) -> int:
        self._ensure_model()
        assert self._dim is not None
        return self._dim

    @property
    def uses_pretrained_weights(self) -> bool:
        self._ensure_model()
        return self._used_pretrained

    def embed(self, image: Image.Image) -> np.ndarray:
        vector = self.embed_batch([image])
        return vector[0]

    def embed_batch(self, images: list[Image.Image]) -> np.ndarray:
        if not images:
            return np.zeros((0, self.embedding_dim), dtype=np.float32)
        model = self._ensure_model()
        tensor = torch.stack([self._transform(image.convert("RGB")) for image in images]).to(self.device)
        with torch.no_grad():
            features = model(tensor).flatten(1)
            features = torch.nn.functional.normalize(features, p=2, dim=1)
        return features.cpu().numpy().astype(np.float32)

    def model_version(self) -> str:
        suffix = "pretrained" if self.pretrained else "random-init"
        return f"embed-{self.backbone}-{suffix}-v1"


@lru_cache(maxsize=2)
def get_embedder(backbone: str, pretrained: bool, device: str = "cpu") -> ImageEmbedder:
    return ImageEmbedder(backbone=backbone, pretrained=pretrained, device=device)
