#!/usr/bin/env python3
"""Build dataset/train|val|test from raw/genuine and raw/stock — without leakage.

Why this is not a simple random split
-------------------------------------
The same room photographed twice, or an augmented copy of one photo, must never appear in both
train and test. We therefore:

1. group images by filename prefix and by perceptual-hash similarity (union-find),
2. split **whole groups** 70/15/15, stratified by class,
3. drop exact/near duplicates *inside* a group only,
4. write `dataset/split_manifest.json` so later scripts and tests can prove the split is clean.

Usage:
  python organize_dataset.py --raw raw --out dataset --seed 42
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import imagehash
from PIL import Image, ImageOps

LABELS = {"genuine": "genuine", "stock": "stock_or_reused"}
SPLITS = ("train", "val", "test")
SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
MAX_DIMENSION = 1024
JPEG_QUALITY = 90
DEFAULT_HASH_THRESHOLD = 8


@dataclass
class Sample:
    path: Path
    label: str
    stem_group: str
    dhash: imagehash.ImageHash | None = None
    phash: imagehash.ImageHash | None = None


@dataclass
class Group:
    group_id: str
    label: str
    samples: list[Sample] = field(default_factory=list)
    split: str = ""


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))

    def find(self, item: int) -> int:
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, left: int, right: int) -> None:
        root_left, root_right = self.find(left), self.find(right)
        if root_left != root_right:
            self.parent[root_right] = root_left


def load_samples(raw_dir: Path) -> tuple[list[Sample], list[str]]:
    samples: list[Sample] = []
    warnings: list[str] = []
    for raw_label, label in LABELS.items():
        folder = raw_dir / raw_label
        if not folder.exists():
            warnings.append(f"Missing raw folder: {folder}")
            continue
        for path in sorted(folder.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            stem_group = path.stem.split("__")[0].strip().lower()
            samples.append(Sample(path=path, label=label, stem_group=stem_group))
    return samples, warnings


def compute_hashes(samples: list[Sample]) -> None:
    for sample in samples:
        try:
            with Image.open(sample.path) as image:
                rgb = ImageOps.exif_transpose(image).convert("RGB")
                sample.dhash = imagehash.dhash(rgb, hash_size=8)
                sample.phash = imagehash.phash(rgb, hash_size=8)
        except Exception:
            sample.dhash = None
            sample.phash = None


def group_samples(samples: list[Sample], threshold: int = DEFAULT_HASH_THRESHOLD) -> list[Group]:
    """Union-find over filename prefixes and perceptual hash distance (within a label)."""
    groups: list[Group] = []
    for label in sorted({sample.label for sample in samples}):
        label_samples = [sample for sample in samples if sample.label == label and sample.dhash is not None]
        if not label_samples:
            continue
        union = UnionFind(len(label_samples))
        by_stem: dict[str, int] = {}
        for index, sample in enumerate(label_samples):
            if sample.stem_group:
                if sample.stem_group in by_stem:
                    union.union(index, by_stem[sample.stem_group])
                else:
                    by_stem[sample.stem_group] = index
        for i in range(len(label_samples)):
            for j in range(i + 1, len(label_samples)):
                left, right = label_samples[i], label_samples[j]
                distance = min(left.dhash - right.dhash, left.phash - right.phash)  # type: ignore[operator]
                if distance <= threshold:
                    union.union(i, j)

        buckets: dict[int, list[Sample]] = defaultdict(list)
        for index, sample in enumerate(label_samples):
            buckets[union.find(index)].append(sample)
        for members in buckets.values():
            digest = hashlib.sha1("|".join(sorted(str(member.path) for member in members)).encode()).hexdigest()[:10]
            groups.append(Group(group_id=f"{label}-{digest}", label=label, samples=members))
    return groups


def assign_splits(groups: list[Group], seed: int = 42) -> dict[str, int]:
    import random

    rng = random.Random(seed)
    counts = Counter()
    for label in sorted({group.label for group in groups}):
        label_groups = [group for group in groups if group.label == label]
        rng.shuffle(label_groups)
        total = len(label_groups)
        n_val = max(1, round(total * SPLIT_RATIOS["val"])) if total >= 4 else 0
        n_test = max(1, round(total * SPLIT_RATIOS["test"])) if total >= 4 else 0
        for index, group in enumerate(label_groups):
            if index < n_test:
                group.split = "test"
            elif index < n_test + n_val:
                group.split = "val"
            else:
                group.split = "train"
            counts[(group.split, label)] += len(group.samples)
    return dict(counts)


def dedupe_group(group: Group, threshold: int = 2) -> tuple[list[Sample], list[Sample]]:
    kept: list[Sample] = []
    skipped: list[Sample] = []
    for sample in group.samples:
        duplicate = False
        for existing in kept:
            if sample.dhash is None or existing.dhash is None:
                continue
            if (sample.dhash - existing.dhash) <= threshold or (sample.phash - existing.phash) <= threshold:  # type: ignore[operator]
                duplicate = True
                break
        (skipped if duplicate else kept).append(sample)
    return kept, skipped


def safe_output_name(sample: Sample) -> str:
    digest = hashlib.sha1(f"{sample.path}|{sample.label}".encode()).hexdigest()[:8]
    return f"{sample.stem_group or 'photo'}_{digest}.jpg"


def write_image(source: Path, destination: Path) -> tuple[int, int]:
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return image.size


def organize(raw_dir: Path, out_dir: Path, seed: int = 42, threshold: int = DEFAULT_HASH_THRESHOLD) -> dict:
    raw_dir, out_dir = Path(raw_dir), Path(out_dir)
    samples, warnings = load_samples(raw_dir)
    if not samples:
        raise SystemExit(
            f"No images found under {raw_dir}/genuine or {raw_dir}/stock.\n"
            "See download_helper.md for the collection plan."
        )

    unreadable: list[Sample] = []
    compute_hashes(samples)
    unreadable = [sample for sample in samples if sample.dhash is None]
    samples = [sample for sample in samples if sample.dhash is not None]
    if not samples:
        raise SystemExit("None of the raw images could be read. Check the files and formats.")

    groups = group_samples(samples, threshold)
    assign_splits(groups, seed)

    for split in SPLITS:
        for label in LABELS.values():
            (out_dir / split / label).mkdir(parents=True, exist_ok=True)

    manifest_groups: list[dict] = []
    skipped_records: list[dict] = []
    split_counts: dict[str, Counter] = {split: Counter() for split in SPLITS}
    sizes: list[tuple[int, int]] = []

    for group in groups:
        kept, skipped = dedupe_group(group)
        if not kept:
            continue
        outputs: list[str] = []
        for sample in kept:
            destination = out_dir / group.split / group.label / safe_output_name(sample)
            sizes.append(write_image(sample.path, destination))
            outputs.append(str(destination.relative_to(out_dir)))
            split_counts[group.split][group.label] += 1
        for sample in skipped:
            skipped_records.append({"file": str(sample.path), "group": group.group_id, "reason": "near-duplicate inside group"})
        manifest_groups.append(
            {
                "groupId": group.group_id,
                "label": group.label,
                "split": group.split,
                "sourceFiles": [str(sample.path) for sample in group.samples],
                "outputFiles": outputs,
            }
        )

    manifest = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "seed": seed,
        "hashThreshold": threshold,
        "rawDir": str(raw_dir),
        "splits": {split: dict(split_counts[split]) for split in SPLITS},
        "totals": {label: sum(split_counts[split][label] for split in SPLITS) for label in LABELS.values()},
        "groups": manifest_groups,
        "skippedDuplicates": skipped_records,
        "warnings": warnings,
    }
    (out_dir / "split_manifest.json").write_text(json.dumps(manifest, indent=2))

    print_report(manifest, sizes, unreadable)
    return manifest


def print_report(manifest: dict, sizes: list[tuple[int, int]], unreadable: list[Sample]) -> None:
    print("\n=== RentSaathi dataset report ===")
    for split in SPLITS:
        counts = manifest["splits"][split]
        total = sum(counts.values())
        print(f"{split:>5}: {total:>5} images  " + "  ".join(f"{label}={counts.get(label, 0)}" for label in LABELS.values()))
    print("\nTotals:")
    for label, count in manifest["totals"].items():
        flag = "  <-- LOW" if count < 100 else ""
        print(f"  {label:>16}: {count}{flag}")
        if count < 100:
            print(f"    WARNING: '{label}' has fewer than 100 images. Aim for 300-500 (ideally 500-1000).")
    if sizes:
        widths = [size[0] for size in sizes]
        heights = [size[1] for size in sizes]
        print(f"\nImage sizes after resize: {min(widths)}x{min(heights)} to {max(widths)}x{max(heights)}")
    if unreadable:
        print(f"\nUnreadable files skipped: {len(unreadable)}")
    if manifest["skippedDuplicates"]:
        print(f"Near-duplicates removed inside groups: {len(manifest['skippedDuplicates'])}")
    print(f"\nManifest: {Path(manifest['rawDir']).parent / 'dataset' / 'split_manifest.json'}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Organize raw RentSaathi images into leak-free splits")
    parser.add_argument("--raw", default="raw", help="folder containing genuine/ and stock/")
    parser.add_argument("--out", default="dataset", help="output dataset folder")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--threshold", type=int, default=DEFAULT_HASH_THRESHOLD, help="perceptual hash distance that groups images")
    parser.add_argument("--clean", action="store_true", help="delete existing train/val/test folders first")
    args = parser.parse_args()

    if args.clean:
        for split in SPLITS:
            target = Path(args.out) / split
            if target.exists():
                shutil.rmtree(target)

    organize(Path(args.raw), Path(args.out), seed=args.seed, threshold=args.threshold)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
