"""Environment-driven configuration for the RentSaathi AI service."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

try:  # optional, keeps local dev convenient without extra setup
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover
    pass

BASE_DIR = Path(__file__).resolve().parent.parent


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _csv(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass
class Settings:
    """Runtime settings. All values can be overridden with environment variables."""

    ai_mode: str = field(default_factory=lambda: os.getenv("AI_MODE", "auto").lower())
    api_key: str = field(default_factory=lambda: os.getenv("AI_API_KEY", "dev-local-key"))
    model_dir: Path = field(default_factory=lambda: Path(os.getenv("MODEL_DIR", str(BASE_DIR / "models"))))
    data_dir: Path = field(default_factory=lambda: Path(os.getenv("DATA_DIR", str(BASE_DIR / "data"))))
    reports_dir: Path = field(default_factory=lambda: Path(os.getenv("REPORTS_DIR", str(BASE_DIR / "reports"))))

    cors_origins: list[str] = field(
        default_factory=lambda: _csv(
            "CORS_ORIGINS",
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:5000",
            ],
        )
    )

    embedding_backbone: str = field(default_factory=lambda: os.getenv("EMBEDDING_BACKBONE", "efficientnet_b0"))
    allow_random_weights: bool = field(default_factory=lambda: _bool("ALLOW_RANDOM_WEIGHTS", False))
    device: str = field(default_factory=lambda: os.getenv("AI_DEVICE", "cpu"))

    image_timeout_seconds: float = field(default_factory=lambda: _float("IMAGE_TIMEOUT_SECONDS", 8.0))
    image_max_bytes: int = field(default_factory=lambda: _int("IMAGE_MAX_BYTES", 6 * 1024 * 1024))
    max_images: int = field(default_factory=lambda: _int("MAX_IMAGES", 15))
    max_image_pixels: int = field(default_factory=lambda: _int("MAX_IMAGE_PIXELS", 40_000_000))

    duplicate_cosine_threshold: float = field(default_factory=lambda: _float("DUPLICATE_COSINE_THRESHOLD", 0.92))
    duplicate_phash_threshold: float = field(default_factory=lambda: _float("DUPLICATE_PHASH_THRESHOLD", 0.86))
    duplicate_floor: float = field(default_factory=lambda: _float("DUPLICATE_FLOOR", 0.72))

    weight_duplicate: float = field(default_factory=lambda: _float("WEIGHT_DUPLICATE", 0.45))
    weight_classifier: float = field(default_factory=lambda: _float("WEIGHT_CLASSIFIER", 0.35))
    weight_anomaly: float = field(default_factory=lambda: _float("WEIGHT_ANOMALY", 0.20))

    suspicious_threshold: float = field(default_factory=lambda: _float("SUSPICIOUS_THRESHOLD", 35.0))
    high_risk_threshold: float = field(default_factory=lambda: _float("HIGH_RISK_THRESHOLD", 65.0))

    classifier_path: Path = field(init=False)
    classifier_meta_path: Path = field(init=False)
    anomaly_model_path: Path = field(init=False)
    metrics_path: Path = field(init=False)
    synthetic_metadata_path: Path = field(init=False)

    def __post_init__(self) -> None:
        self.model_dir = Path(self.model_dir)
        self.data_dir = Path(self.data_dir)
        self.reports_dir = Path(self.reports_dir)
        self.classifier_path = self.model_dir / "image_cnn.pt"
        self.classifier_meta_path = self.model_dir / "image_cnn_meta.json"
        self.anomaly_model_path = self.model_dir / "metadata_iforest.pkl"
        self.metrics_path = self.reports_dir / "metrics.json"
        self.synthetic_metadata_path = self.data_dir / "synthetic_metadata.csv"

    @property
    def trained_model_available(self) -> bool:
        return self.classifier_path.exists()

    @property
    def resolved_mode(self) -> str:
        """AI_MODE=auto switches to the trained model as soon as weights exist."""
        if self.ai_mode == "trained":
            return "trained"
        if self.ai_mode == "bootstrap":
            return "bootstrap"
        return "trained" if self.trained_model_available else "bootstrap"

    def ensure_dirs(self) -> None:
        for directory in (self.model_dir, self.data_dir, self.reports_dir):
            directory.mkdir(parents=True, exist_ok=True)


settings = Settings()
