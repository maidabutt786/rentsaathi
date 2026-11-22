from __future__ import annotations

import shutil

from pathlib import Path

import numpy as np
import pytest
from PIL import Image, ImageDraw

from augment_duplicates import augment
from dataset_stats import analyse
from organize_dataset import organize


def make_photo(seed: int, size: int = 96) -> Image.Image:
    rng = np.random.default_rng(seed)
    array = rng.integers(0, 256, size=(size, size, 3), dtype=np.uint8)
    return Image.fromarray(array, mode="RGB")


def make_variant(image: Image.Image, corner: int) -> Image.Image:
    variant = image.copy()
    draw = ImageDraw.Draw(variant)
    x = 6 + (corner % 4) * 18
    y = 6 + (corner // 4) * 18
    draw.rectangle([x, y, x + 14, y + 14], fill=(220, 40, 40))
    return variant


@pytest.fixture
def raw_dir(tmp_path: Path) -> Path:
    raw = tmp_path / "raw"
    for label in ("genuine", "stock"):
        (raw / label).mkdir(parents=True)
    for index in range(16):
        base = make_photo(100 + index)
        base.save(raw / "genuine" / f"room{index:02d}__a.jpg", quality=92)
        make_variant(base, index).save(raw / "genuine" / f"room{index:02d}__b.jpg", quality=92)
        stock = make_photo(500 + index)
        stock.save(raw / "stock" / f"stock{index:02d}__a.jpg", quality=92)
        make_variant(stock, index + 3).save(raw / "stock" / f"stock{index:02d}__b.jpg", quality=92)
    return raw


def test_organize_builds_three_splits(raw_dir: Path, tmp_path: Path) -> None:
    dataset = tmp_path / "dataset"
    manifest = organize(raw_dir, dataset, seed=42)

    assert manifest["totals"]["genuine"] >= 24
    assert manifest["totals"]["stock_or_reused"] >= 24
    total = sum(manifest["totals"].values())
    train = sum(manifest["splits"]["train"].values())
    assert train / total >= 0.6
    assert sum(manifest["splits"]["val"].values()) > 0
    assert sum(manifest["splits"]["test"].values()) > 0

    for split in ("train", "val", "test"):
        for label in ("genuine", "stock_or_reused"):
            folder = dataset / split / label
            assert folder.exists()
            assert any(folder.glob("*.jpg"))


def test_whole_groups_stay_in_one_split(raw_dir: Path, tmp_path: Path) -> None:
    dataset = tmp_path / "dataset"
    manifest = organize(raw_dir, dataset, seed=7)
    seen: dict[str, str] = {}
    for group in manifest["groups"]:
        if group["groupId"] in seen:
            assert seen[group["groupId"]] == group["split"]
        seen[group["groupId"]] = group["split"]
    assert len(seen) == len(manifest["groups"])


def test_no_leakage_after_organize(raw_dir: Path, tmp_path: Path) -> None:
    dataset = tmp_path / "dataset"
    organize(raw_dir, dataset, seed=42)
    report = analyse(dataset)
    assert report["ok"] is True
    assert report["leakage"] == []
    assert report["manifestLeakage"] == []
    assert report["duplicateTestPairs"] == 0


def test_exact_duplicates_inside_group_are_removed(tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    (raw / "genuine").mkdir(parents=True)
    (raw / "stock").mkdir(parents=True)
    image = make_photo(1)
    image.save(raw / "genuine" / "roomX__a.jpg")
    image.save(raw / "genuine" / "roomX__copy.jpg")
    make_photo(2).save(raw / "genuine" / "roomY__a.jpg")
    make_photo(3).save(raw / "stock" / "stockX__a.jpg")
    make_photo(4).save(raw / "stock" / "stockY__a.jpg")

    manifest = organize(raw, tmp_path / "dataset", seed=1)
    assert manifest["skippedDuplicates"], "identical images should be deduplicated"
    group = next(g for g in manifest["groups"] if any("roomX" in path for path in g["sourceFiles"]))
    assert len(group["outputFiles"]) == 1


def test_augment_keeps_variants_in_source_split(raw_dir: Path, tmp_path: Path) -> None:
    dataset = tmp_path / "dataset"
    manifest = organize(raw_dir, dataset, seed=42)
    report = augment(dataset, copies=2, seed=5, duplicate_test_limit=8)

    assert report["variantsCreated"] > 0
    assert report["duplicateTestPairs"] == 8
    source_splits = {output: group["split"] for group in manifest["groups"] for output in group["outputFiles"]}
    for item in report["variants"]:
        assert item["output"].startswith(f"{item['split']}/stock_or_reused/")
        assert source_splits[item["source"]] == item["split"]

    stats = analyse(dataset)
    assert stats["ok"] is True
    assert stats["duplicateTestPairs"] == 8

    originals = sorted((dataset / "duplicate_test" / "originals").glob("*.jpg"))
    variants = sorted((dataset / "duplicate_test" / "variants").glob("*.jpg"))
    assert len(originals) == 8
    assert len(variants) == 16
    original_stems = {path.stem for path in originals}
    for variant in variants:
        assert variant.stem.split("__")[0] in original_stems


def test_stats_detects_injected_leakage(raw_dir: Path, tmp_path: Path) -> None:
    dataset = tmp_path / "dataset"
    organize(raw_dir, dataset, seed=42)
    source = next((dataset / "train" / "genuine").glob("*.jpg"))
    (dataset / "test" / "genuine").mkdir(parents=True, exist_ok=True)
    shutil.copy(source, dataset / "test" / "genuine" / "leaked.jpg")

    report = analyse(dataset)
    assert report["ok"] is False
    assert report["leakage"]
    assert any("train" in record["splits"] and "test" in record["splits"] for record in report["leakage"])


def test_organize_without_images_fails_clearly(tmp_path: Path) -> None:
    with pytest.raises(SystemExit):
        organize(tmp_path / "empty", tmp_path / "dataset")
