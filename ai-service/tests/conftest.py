"""Shared pytest fixtures: a deterministic embedder and an in-memory image fetcher.

These replace only the *I/O* edges (network + heavy CNN) so the real scoring, indexing,
anomaly and API code paths are exercised. The CNN itself is covered in test_embeddings.py.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.classifier import StockPhotoClassifier
from app.config import Settings
from app.fetcher import ImageFetchError
from app.main import create_app
from app.service import FraudDetectionService


class StubEmbedder:
    """Deterministic colour-histogram embedding with the same contract as ImageEmbedder."""

    backbone = "stub"
    uses_pretrained_weights = True

    def __init__(self) -> None:
        self._dim = 64

    @property
    def embedding_dim(self) -> int:
        return self._dim

    def model_version(self) -> str:
        return "stub-embed-v1"

    def embed_batch(self, images: list[Image.Image]) -> np.ndarray:
        if not images:
            return np.zeros((0, self._dim), dtype=np.float32)
        rows = []
        for image in images:
            array = np.asarray(image.convert("RGB").resize((32, 32)), dtype=np.float32) / 255.0
            histogram, _ = np.histogramdd(
                array.reshape(-1, 3),
                bins=(4, 4, 4),
                range=((0, 1), (0, 1), (0, 1)),
            )
            rows.append(histogram.flatten())
        matrix = np.asarray(rows, dtype=np.float32)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        return matrix / np.clip(norms, 1e-12, None)

    def embed(self, image: Image.Image) -> np.ndarray:
        return self.embed_batch([image])[0]


class FakeFetcher:
    def __init__(self) -> None:
        self.images: dict[str, Image.Image] = {}

    def add(self, url: str, image: Image.Image) -> None:
        self.images[url] = image

    def fetch(self, url: str) -> Image.Image:
        if url not in self.images:
            raise ImageFetchError(f"not found: {url}")
        return self.images[url].copy()


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        ai_mode="bootstrap",
        api_key="test-key",
        model_dir=tmp_path / "models",
        data_dir=tmp_path / "data",
        reports_dir=tmp_path / "reports",
        embedding_backbone="resnet18",
        allow_random_weights=True,
    )


@pytest.fixture
def fetcher() -> FakeFetcher:
    return FakeFetcher()


@pytest.fixture
def service(settings: Settings, fetcher: FakeFetcher) -> FraudDetectionService:
    classifier = StockPhotoClassifier(settings.classifier_path, settings.classifier_meta_path)
    return FraudDetectionService(
        settings,
        embedder=StubEmbedder(),  # type: ignore[arg-type]
        fetcher=fetcher,  # type: ignore[arg-type]
        classifier=classifier,
    )


@pytest.fixture
def client(service: FraudDetectionService) -> TestClient:
    return TestClient(create_app(service))


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-API-KEY": "test-key"}


def make_image(color: tuple[int, int, int], size: int = 96, pattern: int = 0) -> Image.Image:
    image = Image.new("RGB", (size, size), color)
    if pattern:
        pixels = image.load()
        for x in range(size):
            for y in range(size):
                if (x // 8 + y // 8) % 2 == 0:
                    pixels[x, y] = (255, 255, 255)
    return image
