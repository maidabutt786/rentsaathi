"""Metadata anomaly detection with IsolationForest.

Trained on synthetic demo data at first start (no labelled data required), and retrainable on a
real CSV with the same columns. Returns a 0..1 risk plus plain-English reasons.
"""
from __future__ import annotations

import logging
import pickle
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from .schemas import ListingMetadata
from .synthetic import write_synthetic_csv

logger = logging.getLogger(__name__)

FEATURES = [
    "price",
    "area_sqft",
    "price_per_sqft",
    "image_count",
    "description_length",
    "owner_posting_frequency",
]


@dataclass
class AnomalyResult:
    risk: float | None
    reasons: list[str] = field(default_factory=list)
    score_raw: float | None = None


class MetadataAnomalyDetector:
    def __init__(self, model_path: Path, synthetic_csv_path: Path) -> None:
        self.model_path = Path(model_path)
        self.synthetic_csv_path = Path(synthetic_csv_path)
        self.model: IsolationForest | None = None
        self.medians: dict[str, float] = {}
        self.iqr: dict[str, float] = {}
        self.score_lo = -0.1
        self.score_hi = 0.15
        self.rows = 0

    # ------------------------------------------------------------------ train
    def _load_or_generate_frame(self) -> pd.DataFrame:
        if self.synthetic_csv_path.exists():
            return pd.read_csv(self.synthetic_csv_path)
        path = write_synthetic_csv(self.synthetic_csv_path)
        logger.info("Generated synthetic metadata at %s", path)
        return pd.read_csv(path)

    def _frame_to_features(self, frame: pd.DataFrame) -> np.ndarray:
        working = frame.copy()
        working["price"] = pd.to_numeric(working["price"], errors="coerce")
        working["area_sqft"] = pd.to_numeric(working.get("area_sqft", working.get("areaSqft")), errors="coerce")
        working["price_per_sqft"] = working["price"] / working["area_sqft"].clip(lower=1)
        working["image_count"] = pd.to_numeric(working.get("image_count", 1), errors="coerce")
        working["description_length"] = pd.to_numeric(working.get("description_length", 100), errors="coerce")
        working["owner_posting_frequency"] = pd.to_numeric(working.get("owner_posting_frequency", 1), errors="coerce")
        working = working[FEATURES].replace([np.inf, -np.inf], np.nan)
        working = working.fillna(working.median(numeric_only=True))
        return working.to_numpy(dtype=np.float64)

    def train(self, frame: pd.DataFrame | None = None) -> int:
        frame = frame if frame is not None else self._load_or_generate_frame()
        matrix = self._frame_to_features(frame)
        self.rows = len(matrix)
        contamination = float(np.clip(0.06, 0.01, 0.2))
        self.model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(matrix)

        feature_frame = pd.DataFrame(matrix, columns=FEATURES)
        self.medians = feature_frame.median().to_dict()
        q1 = feature_frame.quantile(0.25)
        q3 = feature_frame.quantile(0.75)
        self.iqr = (q3 - q1).replace(0, 1.0).to_dict()

        scores = self.model.decision_function(matrix)
        self.score_lo = float(np.percentile(scores, 5))
        self.score_hi = float(np.percentile(scores, 95))
        if self.score_hi - self.score_lo < 1e-6:
            self.score_hi = self.score_lo + 1e-6
        self.save()
        logger.info("IsolationForest trained on %s rows", self.rows)
        return self.rows

    def save(self) -> None:
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "model": self.model,
            "medians": self.medians,
            "iqr": self.iqr,
            "score_lo": self.score_lo,
            "score_hi": self.score_hi,
            "rows": self.rows,
        }
        with self.model_path.open("wb") as handle:
            pickle.dump(payload, handle)

    def load(self) -> bool:
        if not self.model_path.exists():
            return False
        try:
            with self.model_path.open("rb") as handle:
                payload = pickle.load(handle)
            self.model = payload["model"]
            self.medians = payload.get("medians", {})
            self.iqr = payload.get("iqr", {})
            self.score_lo = payload.get("score_lo", -0.1)
            self.score_hi = payload.get("score_hi", 0.15)
            self.rows = payload.get("rows", 0)
            return True
        except Exception as exc:  # corrupt file -> retrain
            logger.warning("Could not load anomaly model (%s); retraining.", exc)
            return False

    def ensure_ready(self) -> None:
        if not self.load():
            self.train()

    # ------------------------------------------------------------------ score
    def _metadata_vector(self, metadata: ListingMetadata) -> np.ndarray | None:
        price = metadata.price
        area = metadata.areaSqft
        if price is None or area is None or area <= 0:
            return None
        # Missing optional fields fall back to the training median so an incomplete listing is
        # not punished as an anomaly just for being incomplete.
        image_count = metadata.imageCount if metadata.imageCount is not None else self.medians.get("image_count", 5.0)
        description_length = (
            metadata.descriptionLength
            if metadata.descriptionLength is not None
            else self.medians.get("description_length", 300.0)
        )
        owner_frequency = (
            metadata.ownerPostingFrequency
            if metadata.ownerPostingFrequency is not None
            else self.medians.get("owner_posting_frequency", 2.0)
        )
        return np.array(
            [
                float(price),
                float(area),
                float(price) / float(area),
                float(image_count),
                float(description_length),
                float(owner_frequency),
            ],
            dtype=np.float64,
        )

    def score(self, metadata: ListingMetadata) -> AnomalyResult:
        if self.model is None:
            self.ensure_ready()
        vector = self._metadata_vector(metadata)
        if vector is None or self.model is None:
            return AnomalyResult(risk=None, reasons=[])

        raw = float(self.model.decision_function(vector.reshape(1, -1))[0])
        risk = (self.score_hi - raw) / (self.score_hi - self.score_lo)
        risk = float(np.clip(risk, 0.0, 1.0))

        reasons: list[str] = []
        values = dict(zip(FEATURES, vector))
        labels = {
            "price": "monthly rent",
            "area_sqft": "room size",
            "price_per_sqft": "price per square foot",
            "image_count": "number of photos",
            "description_length": "description length",
            "owner_posting_frequency": "owner posting frequency",
        }
        for feature, value in values.items():
            median = self.medians.get(feature, 0.0)
            iqr = max(self.iqr.get(feature, 1.0), 1e-6)
            z = (value - median) / iqr
            if z <= -3.0:
                reasons.append(
                    f"The {labels[feature]} is unusually low compared with similar listings "
                    f"({_format_value(feature, value)} vs typical {_format_value(feature, median)})."
                )
            elif z >= 3.0:
                reasons.append(
                    f"The {labels[feature]} is unusually high compared with similar listings "
                    f"({_format_value(feature, value)} vs typical {_format_value(feature, median)})."
                )
        return AnomalyResult(risk=risk, reasons=reasons[:3], score_raw=raw)


def _format_value(feature: str, value: float) -> str:
    if feature == "price":
        return f"PKR {value:,.0f}"
    if feature == "price_per_sqft":
        return f"PKR {value:,.0f}/sqft"
    if feature == "area_sqft":
        return f"{value:,.0f} sqft"
    if feature == "image_count":
        return f"{value:,.0f} photos"
    if feature == "description_length":
        return f"{value:,.0f} characters"
    return f"{value:,.1f}"
