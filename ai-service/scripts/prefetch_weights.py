#!/usr/bin/env python3
"""Download torchvision backbone weights once (used in Docker builds and offline laptops)."""
from __future__ import annotations

import argparse

from app.classifier import build_classifier
from app.embeddings import ImageEmbedder


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backbone", default="efficientnet_b0", choices=["efficientnet_b0", "resnet18", "resnet50"])
    args = parser.parse_args()

    embedder = ImageEmbedder(args.backbone, pretrained=True)
    embedder._ensure_model()
    print(f"Embedding backbone ready: {args.backbone} (pretrained={embedder.uses_pretrained_weights})")
    build_classifier(args.backbone, num_classes=2, pretrained=True)
    print("Classifier backbone weights cached.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
