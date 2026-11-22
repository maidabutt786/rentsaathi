#!/usr/bin/env python3
"""Report class balance, image sizes, duplicates and split leakage.

Exit code 1 when leakage is detected, so it can gate CI / a training run.

Usage:
  python dataset_stats.py --dataset dataset
"""
from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

import imagehash
from PIL import Image, ImageOps

SPLITS = ("train", "val", "test")
LABELS = ("genuine", "stock_or_reused")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
NEAR_DUPLICATE_DISTANCE = 4


def list_images(dataset: Path) -> dict[tuple[str, str], list[Path]]:
    result: dict[tuple[str, str], list[Path]] = {}
    for split in SPLITS:
        for label in LABELS:
            folder = dataset / split / label
            result[(split, label)] = (
                sorted(path for path in folder.iterdir() if path.suffix.lower() in IMAGE_EXTENSIONS)
                if folder.exists()
                else []
            )
    return result


def hash_images(paths: list[Path]) -> dict[Path, imagehash.ImageHash]:
    hashes: dict[Path, imagehash.ImageHash] = {}
    for path in paths:
        try:
            with Image.open(path) as image:
                hashes[path] = imagehash.dhash(ImageOps.exif_transpose(image).convert("RGB"), hash_size=8)
        except Exception:
            continue
    return hashes


def find_duplicate_clusters(hashes: dict[Path, imagehash.ImageHash], distance: int = NEAR_DUPLICATE_DISTANCE) -> list[list[Path]]:
    paths = list(hashes)
    parent = list(range(len(paths)))

    def find(item: int) -> int:
        while parent[item] != item:
            parent[item] = parent[parent[item]]
            item = parent[item]
        return item

    for i in range(len(paths)):
        for j in range(i + 1, len(paths)):
            if (hashes[paths[i]] - hashes[paths[j]]) <= distance:
                root_i, root_j = find(i), find(j)
                if root_i != root_j:
                    parent[root_j] = root_i

    buckets: dict[int, list[Path]] = defaultdict(list)
    for index, path in enumerate(paths):
        buckets[find(index)].append(path)
    return [members for members in buckets.values() if len(members) > 1]


def split_of(path: Path) -> str:
    for split in SPLITS:
        if split in path.parts:
            return split
    return "duplicate_test" if "duplicate_test" in path.parts else "unknown"


def analyse(dataset: Path) -> dict:
    dataset = Path(dataset)
    images = list_images(dataset)
    counts = {f"{split}/{label}": len(paths) for (split, label), paths in images.items()}
    class_totals = Counter()
    for (split, label), paths in images.items():
        class_totals[label] += len(paths)

    sizes: list[tuple[int, int]] = []
    for paths in images.values():
        for path in paths:
            try:
                with Image.open(path) as image:
                    sizes.append(image.size)
            except Exception:
                continue
    size_stats = {}
    if sizes:
        widths = [size[0] for size in sizes]
        heights = [size[1] for size in sizes]
        size_stats = {
            "minWidth": min(widths),
            "maxWidth": max(widths),
            "minHeight": min(heights),
            "maxHeight": max(heights),
            "meanWidth": round(sum(widths) / len(widths), 1),
            "meanHeight": round(sum(heights) / len(heights), 1),
        }

    all_paths = [path for paths in images.values() for path in paths]
    hashes = hash_images(all_paths)
    clusters = find_duplicate_clusters(hashes)
    cluster_records = []
    leakage = []
    for cluster in clusters:
        splits = sorted({split_of(path) for path in cluster})
        record = {"files": [str(path) for path in cluster], "splits": splits}
        cluster_records.append(record)
        if len(splits) > 1:
            leakage.append(record)

    manifest_leakage = []
    manifest_path = dataset / "split_manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        group_splits: dict[str, set[str]] = defaultdict(set)
        for group in manifest.get("groups", []):
            group_splits[group["groupId"]].add(group["split"])
        manifest_leakage = [
            {"groupId": group_id, "splits": sorted(splits)}
            for group_id, splits in group_splits.items()
            if len(splits) > 1
        ]

    duplicate_test_pairs = 0
    duplicate_test = dataset / "duplicate_test" / "originals"
    if duplicate_test.exists():
        duplicate_test_pairs = len([p for p in duplicate_test.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS])

    warnings = []
    for label, total in class_totals.items():
        if total < 100:
            warnings.append(f"Class '{label}' has only {total} images; aim for 300-500 per class.")
    for split in SPLITS:
        for label in LABELS:
            if counts.get(f"{split}/{label}", 0) == 0:
                warnings.append(f"{split}/{label} is empty.")

    return {
        "dataset": str(dataset),
        "counts": counts,
        "classTotals": dict(class_totals),
        "imageSizes": size_stats,
        "duplicateClusters": cluster_records,
        "duplicateCount": sum(len(cluster) for cluster in clusters),
        "leakage": leakage,
        "manifestLeakage": manifest_leakage,
        "duplicateTestPairs": duplicate_test_pairs,
        "warnings": warnings,
        "ok": not leakage and not manifest_leakage,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="RentSaathi dataset statistics and leakage check")
    parser.add_argument("--dataset", default="dataset")
    parser.add_argument("--json", default=None, help="optional path to write the report")
    args = parser.parse_args()

    report = analyse(Path(args.dataset))
    text = json.dumps(report, indent=2)
    print(text)
    if args.json:
        Path(args.json).write_text(text)
    if not report["ok"]:
        print("\nLEAKAGE DETECTED — do not train on this split. Re-run organize_dataset.py with --clean.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
