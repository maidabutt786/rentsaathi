#!/usr/bin/env python3
"""Evaluate the trained classifier and the duplicate detector.

Outputs:
  reports/metrics.json         consumed by GET /metrics and the admin analytics panel
  reports/confusion_matrix.png brand-coloured confusion matrix

Duplicate evaluation expects dataset/duplicate_test/originals/*.jpg and
dataset/duplicate_test/variants/*.jpg where variants share the original file stem
(augment_duplicates.py creates this layout).
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import torch  # noqa: E402
from PIL import Image  # noqa: E402

from app.classifier import build_classifier  # noqa: E402
from app.config import BASE_DIR  # noqa: E402
from app.embeddings import ImageEmbedder  # noqa: E402
from app.hashing import compare_hash_sets, compute_hashes  # noqa: E402
from app.training import compute_metrics, make_dataset, make_loader, predict_loader  # noqa: E402

BRAND_PRIMARY = "#A20224"
BRAND_BROWN = "#764002"


def evaluate_classifier(args, device: torch.device) -> dict:
    checkpoint_path = Path(args.model_dir) / "image_cnn.pt"
    if not checkpoint_path.exists():
        raise SystemExit(f"No checkpoint at {checkpoint_path}. Run train.py first.")
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    backbone = checkpoint.get("backbone", args.backbone)
    model = build_classifier(backbone, num_classes=2, pretrained=False)
    model.load_state_dict(checkpoint["state_dict"])
    model.eval().to(device)

    dataset = make_dataset(Path(args.data_dir), args.split, train=False)
    probabilities, labels = predict_loader(model, make_loader(dataset, args.batch_size), device)
    metrics = compute_metrics(probabilities, labels, threshold=args.threshold)

    matrix = np.array(metrics["confusionMatrix"])
    fig, ax = plt.subplots(figsize=(4.5, 4))
    ax.imshow(matrix, cmap="Reds")
    ax.set_xticks([0, 1], ["genuine", "stock/reused"])
    ax.set_yticks([0, 1], ["genuine", "stock/reused"])
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"RentSaathi image model — {args.split}")
    for i in range(2):
        for j in range(2):
            ax.text(j, i, str(matrix[i, j]), ha="center", va="center", color=BRAND_BROWN, fontsize=14)
    fig.tight_layout()
    reports = Path(args.reports_dir)
    reports.mkdir(parents=True, exist_ok=True)
    fig.savefig(reports / "confusion_matrix.png", dpi=150)
    plt.close(fig)
    return {"metrics": metrics, "modelVersion": checkpoint.get("model_version", "unknown"), "backbone": backbone}


def evaluate_duplicates(args) -> dict:
    base = Path(args.data_dir) / "duplicate_test"
    originals_dir = base / "originals"
    variants_dir = base / "variants"
    if not originals_dir.exists() or not variants_dir.exists():
        return {"available": False, "reason": "dataset/duplicate_test/{originals,variants} not found"}

    embedder = ImageEmbedder(args.backbone, pretrained=not args.random_weights, device=args.device)
    originals = sorted([p for p in originals_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}])
    variants = sorted([p for p in variants_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"}])
    if not originals or not variants:
        return {"available": False, "reason": "duplicate_test folders are empty"}

    variant_by_stem = {p.stem.split("__")[0]: p for p in variants}
    matched = [(p, variant_by_stem[p.stem]) for p in originals if p.stem in variant_by_stem]
    if not matched:
        return {"available": False, "reason": "no matching original/variant stems"}

    def embed_pair(original: Path, variant: Path) -> tuple[float, float]:
        img_a = Image.open(original).convert("RGB")
        img_b = Image.open(variant).convert("RGB")
        vectors = embedder.embed_batch([img_a, img_b])
        cosine = float(np.dot(vectors[0], vectors[1]))
        phash = compare_hash_sets([compute_hashes(img_a)], [compute_hashes(img_b)])
        return cosine, phash

    cosines: list[float] = []
    phashes: list[float] = []
    for original, variant in matched:
        cosine, phash = embed_pair(original, variant)
        cosines.append(cosine)
        phashes.append(phash)

    false_positive_cosines: list[float] = []
    for index in range(len(originals) - 1):
        cosine, _ = embed_pair(originals[index], originals[index + 1])
        false_positive_cosines.append(cosine)

    duplicate_recall = float(np.mean([c >= args.cosine_threshold or p >= args.phash_threshold for c, p in zip(cosines, phashes)]))
    phash_only_recall = float(np.mean([p >= args.phash_threshold for p in phashes]))
    false_positive_rate = (
        float(np.mean([c >= args.cosine_threshold for c in false_positive_cosines])) if false_positive_cosines else 0.0
    )
    return {
        "available": True,
        "pairs": len(matched),
        "cosineThreshold": args.cosine_threshold,
        "phashThreshold": args.phash_threshold,
        "recall": round(duplicate_recall, 4),
        "phashOnlyRecall": round(phash_only_recall, 4),
        "falsePositiveRate": round(false_positive_rate, 4),
        "meanPairCosine": round(float(np.mean(cosines)), 4),
        "meanPairPhash": round(float(np.mean(phashes)), 4),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate RentSaathi image fraud models")
    parser.add_argument("--data-dir", default=str(BASE_DIR.parent / "dataset"))
    parser.add_argument("--model-dir", default=str(BASE_DIR / "models"))
    parser.add_argument("--reports-dir", default=str(BASE_DIR / "reports"))
    parser.add_argument("--backbone", default="efficientnet_b0", choices=["efficientnet_b0", "resnet18", "resnet50"])
    parser.add_argument("--split", default="test", choices=["val", "test"])
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--cosine-threshold", type=float, default=0.92)
    parser.add_argument("--phash-threshold", type=float, default=0.86)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--random-weights", action="store_true", help="Use random backbone weights (offline smoke test)")
    args = parser.parse_args()

    device = torch.device(args.device if torch.cuda.is_available() and args.device != "cpu" else "cpu")
    classifier = evaluate_classifier(args, device)
    duplicates = evaluate_duplicates(args)

    payload = {
        "available": True,
        "mode": "trained",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "modelVersion": classifier["modelVersion"],
        "backbone": classifier["backbone"],
        "classifier": {
            "split": args.split,
            "threshold": args.threshold,
            "labels": ["genuine", "stock_or_reused"],
            **classifier["metrics"],
        },
        "duplicateDetection": duplicates,
    }
    reports = Path(args.reports_dir)
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "metrics.json").write_text(json.dumps(payload, indent=2))
    print(json.dumps(payload, indent=2))
    print(f"\nWrote {reports / 'metrics.json'} and {reports / 'confusion_matrix.png'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
