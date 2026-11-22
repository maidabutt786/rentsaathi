"""Orchestration: fetch -> embed -> duplicate search -> classify -> anomaly -> score."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from PIL import Image

from .anomaly import MetadataAnomalyDetector
from .classifier import StockPhotoClassifier
from .config import Settings
from .embeddings import ImageEmbedder
from .fetcher import HttpImageFetcher, ImageFetcher, ImageFetchError
from .hashing import compute_hashes
from .index import EmbeddingIndex
from .schemas import AnalyzeListingResponse, IndexListingResponse, ListingMetadata, RetrainResponse
from .scoring import ScoreInputs, build_reasons, combine_scores, label_for_score

logger = logging.getLogger(__name__)


class FraudDetectionService:
    def __init__(
        self,
        settings: Settings,
        embedder: ImageEmbedder | None = None,
        fetcher: ImageFetcher | None = None,
        index: EmbeddingIndex | None = None,
        anomaly: MetadataAnomalyDetector | None = None,
        classifier: StockPhotoClassifier | None = None,
    ) -> None:
        self.settings = settings
        self.settings.ensure_dirs()
        self.embedder = embedder or ImageEmbedder(
            backbone=settings.embedding_backbone,
            pretrained=not settings.allow_random_weights,
            device=settings.device,
        )
        self.fetcher = fetcher or _default_fetcher(settings)
        self.index = index or EmbeddingIndex()
        self.anomaly = anomaly or MetadataAnomalyDetector(
            settings.anomaly_model_path, settings.synthetic_metadata_path
        )
        self.classifier = classifier or StockPhotoClassifier(
            settings.classifier_path, settings.classifier_meta_path, settings.device
        )
        self._bootstrap()

    def _bootstrap(self) -> None:
        self.anomaly.ensure_ready()
        if self.settings.resolved_mode == "trained":
            loaded = self.classifier.load()
            if not loaded:
                logger.warning("AI_MODE=trained but no classifier checkpoint was loaded; staying in bootstrap scoring.")

    @property
    def mode(self) -> str:
        return "trained" if self.classifier.available else "bootstrap"

    @property
    def model_version(self) -> str:
        if self.classifier.available:
            return self.classifier.version
        return f"bootstrap-{self.embedder.model_version()}"

    def _fetch_images(self, urls: list[str]) -> tuple[list[Image.Image], int]:
        images: list[Image.Image] = []
        failures = 0
        for url in urls[: self.settings.max_images]:
            try:
                images.append(self.fetcher.fetch(url))
            except ImageFetchError as exc:
                failures += 1
                logger.warning("Image download failed: %s", exc)
        return images, failures

    def _embed(self, images: list[Image.Image]):
        vectors = self.embedder.embed_batch(images) if images else None
        hashes = [compute_hashes(image) for image in images]
        return vectors, hashes

    def analyze_listing(
        self,
        listing_id: str,
        image_urls: list[str],
        metadata: ListingMetadata,
    ) -> AnalyzeListingResponse:
        images, failures = self._fetch_images(image_urls)
        vectors, hashes = self._embed(images)

        duplicate = None
        if vectors is not None and len(vectors):
            duplicate = self.index.search(vectors, hashes, exclude_listing_id=listing_id)

        classifier_probability = self.classifier.predict_stock_probability(images) if images else None
        anomaly_result = self.anomaly.score(metadata)

        score = combine_scores(
            ScoreInputs(
                duplicate=duplicate,
                classifier_probability=classifier_probability,
                anomaly_risk=anomaly_result.risk,
                duplicate_floor=self.settings.duplicate_floor,
                cosine_threshold=self.settings.duplicate_cosine_threshold,
                phash_threshold=self.settings.duplicate_phash_threshold,
                weights={
                    "duplicate": self.settings.weight_duplicate,
                    "classifier": self.settings.weight_classifier,
                    "anomaly": self.settings.weight_anomaly,
                },
            )
        )
        label = label_for_score(score, self.settings.suspicious_threshold, self.settings.high_risk_threshold)
        reasons = build_reasons(
            duplicate=duplicate,
            classifier_probability=classifier_probability,
            anomaly_reasons=anomaly_result.reasons,
            cosine_threshold=self.settings.duplicate_cosine_threshold,
            phash_threshold=self.settings.duplicate_phash_threshold,
            mode=self.mode,
        )
        if failures:
            reasons.insert(0, f"{failures} photo(s) could not be downloaded or were too large; the score uses the remaining photos.")
        if not image_urls:
            reasons.insert(0, "This listing has no photos, so image checks could not run.")

        return AnalyzeListingResponse(
            fraudScore=score,
            fraudLabel=label,  # type: ignore[arg-type]
            duplicateOf=duplicate.listing_id if duplicate and duplicate.similarity >= 0.75 else None,
            duplicateSimilarity=round(duplicate.similarity, 4) if duplicate else 0.0,
            reasons=reasons,
            mode=self.mode,  # type: ignore[arg-type]
            modelVersion=self.model_version,
            analyzedAt=datetime.now(timezone.utc).isoformat(),
        )

    def index_listing(self, listing_id: str, image_urls: list[str]) -> IndexListingResponse:
        images, _ = self._fetch_images(image_urls)
        if not images:
            return IndexListingResponse(indexed=False, listingId=listing_id, images=0, modelVersion=self.model_version)
        vectors, hashes = self._embed(images)
        assert vectors is not None
        self.index.add(listing_id, vectors, hashes)
        return IndexListingResponse(
            indexed=True, listingId=listing_id, images=len(images), modelVersion=self.model_version
        )

    def delete_listing(self, listing_id: str) -> bool:
        return self.index.remove(listing_id)

    def health(self) -> dict:
        return {
            "status": "ok",
            "mode": self.mode,
            "modelVersion": self.model_version,
            "classifierLoaded": self.classifier.available,
            "indexedListings": self.index.size,
            "indexBackend": self.index.backend,
            "backbone": self.embedder.backbone,
            "pretrainedWeights": self.embedder.uses_pretrained_weights,
        }

    def metrics(self) -> dict:
        path: Path = self.settings.metrics_path
        if not path.exists():
            return {"available": False, "mode": self.mode}
        try:
            payload = json.loads(path.read_text())
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Could not read metrics file: %s", exc)
            return {"available": False, "mode": self.mode}
        payload["available"] = True
        return payload

    def retrain_metadata(self, csv_path: str | None = None) -> RetrainResponse:
        target = Path(csv_path).resolve() if csv_path else self.settings.synthetic_metadata_path
        if csv_path:
            allowed_root = self.settings.data_dir.resolve()
            if not target.is_relative_to(allowed_root):
                raise ValueError("metadataCsv must live inside DATA_DIR")
        if not target.exists():
            if csv_path:
                raise FileNotFoundError(f"CSV not found: {target}")
            self.anomaly.train()
        else:
            frame = pd.read_csv(target)
            self.anomaly.train(frame)
        return RetrainResponse(
            retrained=True,
            model="metadata_isolation_forest",
            rows=self.anomaly.rows,
            mode=self.mode,  # type: ignore[arg-type]
            message=(
                "Metadata anomaly model retrained. The image classifier is retrained offline with "
                "train.py (it needs labelled photos)."
            ),
        )


def _default_fetcher(settings: Settings) -> HttpImageFetcher:
    return HttpImageFetcher(timeout_seconds=settings.image_timeout_seconds, max_bytes=settings.image_max_bytes)
