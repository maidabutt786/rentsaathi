#!/usr/bin/env python3
"""Create realistic "reused photo" variants of genuine room photos.

Two uses:
1. Enlarge the `stock_or_reused` class with transformed copies (same split as the original, so no
   leakage).
2. Build `dataset/duplicate_test/{originals,variants}` pairs for duplicate-detection evaluation.

Variants simulate what a landlord might do when reusing a photo: crop, resize, flip, brighten,
recompress, rotate, watermark or screenshot.

Usage:
  python augment_duplicates.py --dataset dataset --copies 3
"""
from __future__ import annotations

import argparse
import io
import json
import random
from datetime import datetime, timezone
from pathlib import Path

import imagehash
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

SPLITS = ("train", "val", "test")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
# Match dataset_stats.py so a generated variant can never create a cross-split leak.
NEAR_DUPLICATE_DISTANCE = 4
VARIANTS = (
    "crop_resize",
    "flip",
    "brightness_contrast",
    "jpeg_recompress",
    "rotate",
    "watermark",
    "screenshot_border",
)


def _font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # older Pillow
        return ImageFont.load_default()


def crop_resize(image: Image.Image, rng: random.Random) -> Image.Image:
    width, height = image.size
    scale = rng.uniform(0.78, 0.94)
    left = int(width * rng.uniform(0.0, 1.0 - scale))
    top = int(height * rng.uniform(0.0, 1.0 - scale))
    cropped = image.crop((left, top, left + int(width * scale), top + int(height * scale)))
    return cropped.resize((width, height), Image.LANCZOS)


def flip(image: Image.Image, rng: random.Random) -> Image.Image:
    return ImageOps.mirror(image) if rng.random() < 0.5 else ImageOps.flip(image)


def brightness_contrast(image: Image.Image, rng: random.Random) -> Image.Image:
    image = ImageEnhance.Brightness(image).enhance(rng.uniform(0.75, 1.25))
    return ImageEnhance.Contrast(image).enhance(rng.uniform(0.8, 1.2))


def jpeg_recompress(image: Image.Image, rng: random.Random) -> Image.Image:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=rng.randint(35, 60))
    buffer.seek(0)
    return Image.open(buffer).convert("RGB")


def rotate(image: Image.Image, rng: random.Random) -> Image.Image:
    angle = rng.uniform(2.0, 7.0) * rng.choice([-1, 1])
    rotated = image.rotate(angle, expand=True, fillcolor=(255, 255, 255))
    return rotated.resize(image.size, Image.LANCZOS)


def watermark(image: Image.Image, rng: random.Random) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    text = rng.choice(["FOR RENT", "RentSaathi verified", "Available Now", "Call for details"])
    font = _font(max(14, image.width // 26))
    bbox = draw.textbbox((0, 0), text, font=font)
    x = image.width - (bbox[2] - bbox[0]) - 16
    y = image.height - (bbox[3] - bbox[1]) - 16
    draw.rectangle([x - 8, y - 6, image.width - 4, image.height - 4], fill=(162, 2, 36, 150))
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 235))
    return Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")


def screenshot_border(image: Image.Image, rng: random.Random) -> Image.Image:
    margin = max(10, image.width // 30)
    top_bar = max(18, image.height // 22)
    canvas = Image.new("RGB", (image.width + margin * 2, image.height + margin * 2 + top_bar), (255, 255, 255))
    canvas.paste(image, (margin, margin + top_bar))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, canvas.width, top_bar + margin], fill=(238, 232, 227))
    for index, colour in enumerate([(162, 2, 36), (217, 160, 102), (46, 125, 50)]):
        draw.ellipse([10 + index * 14, 8, 20 + index * 14, 18], fill=colour)
    draw.text((margin, margin // 2 + top_bar), "room-for-rent.jpg", font=_font(max(10, top_bar // 2)), fill=(80, 70, 64))
    return canvas


OPERATIONS = {
    "crop_resize": crop_resize,
    "flip": flip,
    "brightness_contrast": brightness_contrast,
    "jpeg_recompress": jpeg_recompress,
    "rotate": rotate,
    "watermark": watermark,
    "screenshot_border": screenshot_border,
}


def make_variant(image: Image.Image, rng: random.Random) -> tuple[Image.Image, list[str]]:
    chosen = rng.sample(VARIANTS, k=rng.randint(2, 4))
    if "screenshot_border" in chosen:
        chosen = [name for name in chosen if name != "screenshot_border"] + ["screenshot_border"]
    result = image
    for name in chosen:
        result = OPERATIONS[name](result, rng)
    return result, chosen


def load_manifest(dataset: Path) -> dict:
    path = dataset / "split_manifest.json"
    if not path.exists():
        return {"groups": [], "warnings": ["split_manifest.json missing; run organize_dataset.py first"]}
    return json.loads(path.read_text())


def _dhash(image: Image.Image) -> imagehash.ImageHash:
    return imagehash.dhash(ImageOps.exif_transpose(image).convert("RGB"), hash_size=8)


def _dhash_path(path: Path) -> imagehash.ImageHash | None:
    try:
        with Image.open(path) as opened:
            return _dhash(opened)
    except Exception:
        return None


def _existing_hashes(dataset: Path) -> list[tuple[str, imagehash.ImageHash]]:
    """Hashes of committed split images, used to reject a variant that would leak."""
    result: list[tuple[str, imagehash.ImageHash]] = []
    for split in SPLITS:
        for label in ("genuine", "stock_or_reused"):
            folder = dataset / split / label
            if not folder.exists():
                continue
            for path in sorted(folder.iterdir()):
                if path.suffix.lower() not in IMAGE_EXTENSIONS:
                    continue
                digest = _dhash_path(path)
                if digest is not None:
                    result.append((split, digest))
    return result


def _would_leak(digest: imagehash.ImageHash, split: str, existing: list[tuple[str, imagehash.ImageHash]]) -> bool:
    return any(other_split != split and (digest - other) <= NEAR_DUPLICATE_DISTANCE for other_split, other in existing)


def augment(dataset: Path, copies: int = 3, seed: int = 42, duplicate_test_limit: int = 40) -> dict:
    dataset = Path(dataset)
    manifest = load_manifest(dataset)
    output_to_group = {
        output: group for group in manifest.get("groups", []) for output in group.get("outputFiles", [])
    }

    created: list[dict] = []
    skipped_leakage: list[dict] = []
    originals_for_duplicate_test: list[tuple[str, Path]] = []

    # Reruns should not duplicate files or manifest entries.
    for group in manifest.get("groups", []):
        group["outputFiles"] = [path for path in group.get("outputFiles", []) if "__aug" not in Path(path).stem]
    for split in SPLITS:
        stock_dir = dataset / split / "stock_or_reused"
        if stock_dir.exists():
            for stale in stock_dir.glob("*__aug*.jpg"):
                stale.unlink()
    existing = _existing_hashes(dataset)

    for split in SPLITS:
        genuine_dir = dataset / split / "genuine"
        if not genuine_dir.exists():
            continue
        stock_dir = dataset / split / "stock_or_reused"
        stock_dir.mkdir(parents=True, exist_ok=True)
        for source in sorted(genuine_dir.iterdir()):
            if source.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            with Image.open(source) as opened:
                base = opened.convert("RGB")
            for index in range(copies):
                rng = random.Random(f"{seed}-{split}-{source.name}-{index}")
                variant, operations = make_variant(base, rng)
                destination = stock_dir / f"{source.stem}__aug{index}.jpg"
                variant.save(destination, format="JPEG", quality=88, optimize=True)
                # Hash the saved JPEG: recompression can move a perceptual hash slightly, and the
                # leakage gate in dataset_stats.py must see exactly the same bytes.
                digest = _dhash_path(destination)
                if digest is None or _would_leak(digest, split, existing):
                    destination.unlink(missing_ok=True)
                    skipped_leakage.append(
                        {"source": str(source.relative_to(dataset)), "split": split, "operations": operations}
                    )
                    continue
                relative = str(destination.relative_to(dataset))
                existing.append((split, digest))
                created.append(
                    {"source": str(source.relative_to(dataset)), "output": relative, "operations": operations, "split": split}
                )
                group = output_to_group.get(str(source.relative_to(dataset)))
                if group is not None:
                    group.setdefault("outputFiles", []).append(relative)
                    group["augmented"] = True
            originals_for_duplicate_test.append((split, source))

    duplicate_pairs = build_duplicate_test(dataset, originals_for_duplicate_test, seed, duplicate_test_limit)

    manifest["augmentedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["augmentation"] = {
        "copiesPerOriginal": copies,
        "variantsCreated": len(created),
        "duplicateTestPairs": len(duplicate_pairs),
    }
    (dataset / "split_manifest.json").write_text(json.dumps(manifest, indent=2))

    report = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "copiesPerOriginal": copies,
        "variantsCreated": len(created),
        "variantsSkippedForLeakage": len(skipped_leakage),
        "duplicateTestPairs": len(duplicate_pairs),
        "variants": created,
        "skippedLeakage": skipped_leakage,
    }
    (dataset / "augmentation_manifest.json").write_text(json.dumps(report, indent=2))

    print(f"Created {len(created)} variants in dataset/*/stock_or_reused (same split as source).")
    if skipped_leakage:
        print(f"Skipped {len(skipped_leakage)} variants that were too close to an image in another split.")
    print(f"Created {len(duplicate_pairs)} original/variant pairs in dataset/duplicate_test.")
    print("Wrote dataset/augmentation_manifest.json")
    return report


def build_duplicate_test(
    dataset: Path, originals: list[tuple[str, Path]], seed: int, limit: int
) -> list[dict]:
    if not originals:
        return []
    originals_dir = dataset / "duplicate_test" / "originals"
    variants_dir = dataset / "duplicate_test" / "variants"
    originals_dir.mkdir(parents=True, exist_ok=True)
    variants_dir.mkdir(parents=True, exist_ok=True)

    # Round-robin across splits so train/val/test photos all appear.
    by_split: dict[str, list[Path]] = {}
    for split, path in originals:
        by_split.setdefault(split, []).append(path)
    selected: list[Path] = []
    index = 0
    while len(selected) < limit:
        added = False
        for split in SPLITS:
            paths = by_split.get(split, [])
            if index < len(paths):
                selected.append(paths[index])
                added = True
                if len(selected) >= limit:
                    break
        if not added:
            break
        index += 1

    pairs: list[dict] = []
    for source in selected:
        stem = source.stem
        with Image.open(source) as opened:
            base = opened.convert("RGB")
        base.save(originals_dir / f"{stem}.jpg", format="JPEG", quality=92)
        variant_names = []
        for variant_index in range(2):
            rng = random.Random(f"dup-{seed}-{stem}-{variant_index}")
            variant, operations = make_variant(base, rng)
            name = f"{stem}__v{variant_index}.jpg"
            variant.save(variants_dir / name, format="JPEG", quality=85)
            variant_names.append(name)
        pairs.append({"original": f"{stem}.jpg", "variants": variant_names, "operations": operations})
    return pairs


def main() -> int:
    parser = argparse.ArgumentParser(description="Augment genuine photos into reused-photo variants")
    parser.add_argument("--dataset", default="dataset")
    parser.add_argument("--copies", type=int, default=3, help="variants per genuine photo")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--duplicate-test-limit", type=int, default=40)
    args = parser.parse_args()

    dataset = Path(args.dataset)
    if not (dataset / "train" / "genuine").exists():
        raise SystemExit(f"{dataset}/train/genuine not found. Run organize_dataset.py first.")
    augment(dataset, copies=args.copies, seed=args.seed, duplicate_test_limit=args.duplicate_test_limit)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
