"""Synthetic metadata generator for the anomaly model (clearly labelled demo data).

We do not have real labelled listings yet. The IsolationForest is unsupervised, so it can be
trained on this synthetic distribution on day one; retraining on a real CSV later uses the same
columns (except `is_anomaly`, which is only for reporting / demo tests).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

COLUMNS = [
    "listingId",
    "price",
    "areaSqft",
    "price_per_sqft",
    "image_count",
    "description_length",
    "owner_posting_frequency",
    "is_anomaly",
]

ROOM_TYPES = {
    "shared": 11000,
    "single": 19000,
    "hostel": 9000,
    "apartment": 38000,
}
CITY_MULTIPLIER = {"Gujrat": 0.8, "Lahore": 1.3, "Islamabad": 1.55}
CITIES = list(CITY_MULTIPLIER)


def generate_rows(n_rows: int = 1200, seed: int = 42, anomaly_rate: float = 0.06) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    room_types = rng.choice(list(ROOM_TYPES), size=n_rows, p=[0.45, 0.3, 0.15, 0.1])
    cities = rng.choice(CITIES, size=n_rows, p=[0.35, 0.4, 0.25])

    base = np.array([ROOM_TYPES[r] for r in room_types], dtype=float)
    multiplier = np.array([CITY_MULTIPLIER[c] for c in cities], dtype=float)
    price = base * multiplier * rng.lognormal(mean=0.0, sigma=0.16, size=n_rows)
    area = rng.normal(loc=420, scale=120, size=n_rows).clip(120, 1400)
    image_count = rng.integers(3, 11, size=n_rows)
    description_length = rng.integers(120, 700, size=n_rows)
    owner_posting_frequency = rng.integers(1, 7, size=n_rows)

    n_anomalies = int(n_rows * anomaly_rate)
    anomaly_idx = rng.choice(n_rows, size=n_anomalies, replace=False)
    kinds = rng.choice(
        ["price_low", "price_high", "area_tiny", "image_low", "description_tiny", "spammy_owner", "price_per_sqft_extreme"],
        size=n_anomalies,
    )
    for idx, kind in zip(anomaly_idx, kinds):
        if kind == "price_low":
            price[idx] *= rng.uniform(0.08, 0.25)
        elif kind == "price_high":
            price[idx] *= rng.uniform(3.5, 7.0)
        elif kind == "area_tiny":
            area[idx] = rng.uniform(20, 55)
        elif kind == "image_low":
            image_count[idx] = 1
        elif kind == "description_tiny":
            description_length[idx] = rng.integers(0, 15)
        elif kind == "spammy_owner":
            owner_posting_frequency[idx] = rng.integers(30, 80)
        else:  # price per sqft extreme
            area[idx] = rng.uniform(900, 1400)
            price[idx] *= rng.uniform(0.15, 0.35)

    labels = np.zeros(n_rows, dtype=int)
    labels[anomaly_idx] = 1
    frame = pd.DataFrame(
        {
            "listingId": [f"demo-{i:05d}" for i in range(n_rows)],
            "price": price.round(0),
            "areaSqft": area.round(0),
            "price_per_sqft": (price / area).round(2),
            "image_count": image_count,
            "description_length": description_length,
            "owner_posting_frequency": owner_posting_frequency,
            "is_anomaly": labels,
        }
    )
    return frame


def write_synthetic_csv(path: Path, n_rows: int = 1200, seed: int = 42) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    frame = generate_rows(n_rows=n_rows, seed=seed)
    frame.to_csv(path, index=False)
    return path


if __name__ == "__main__":  # pragma: no cover
    target = write_synthetic_csv(Path(__file__).resolve().parent.parent / "data" / "synthetic_metadata.csv")
    print(f"Wrote {target}")
