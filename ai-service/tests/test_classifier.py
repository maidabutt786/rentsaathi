import json
from pathlib import Path

import torch

from app.classifier import StockPhotoClassifier, build_classifier
from tests.conftest import make_image


def test_checkpoint_roundtrip(tmp_path: Path) -> None:
    model = build_classifier("resnet18", num_classes=2, pretrained=False)
    checkpoint = {
        "state_dict": model.state_dict(),
        "backbone": "resnet18",
        "classes": ["genuine", "stock_or_reused"],
        "model_version": "test-v1",
    }
    path = tmp_path / "image_cnn.pt"
    torch.save(checkpoint, path)
    meta = tmp_path / "image_cnn_meta.json"
    meta.write_text(json.dumps({"test": {"f1": 0.8}}))

    classifier = StockPhotoClassifier(path, meta)
    assert classifier.load() is True
    assert classifier.available is True
    assert classifier.version == "test-v1"
    probability = classifier.predict_stock_probability([make_image((120, 120, 120))])
    assert probability is not None and 0.0 <= probability <= 1.0


def test_missing_checkpoint_stays_unavailable(tmp_path: Path) -> None:
    classifier = StockPhotoClassifier(tmp_path / "missing.pt", tmp_path / "missing.json")
    assert classifier.load() is False
    assert classifier.available is False
    assert classifier.predict_stock_probability([make_image((1, 2, 3))]) is None
