"""Fraud score composition and plain-English explanations.

Score = 100 * weighted mix of duplicate risk, classifier probability (trained mode only) and
metadata anomaly risk. Thresholds and weights are configurable through environment variables.
"""
from __future__ import annotations

from dataclasses import dataclass

from .index import DuplicateMatch


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def label_for_score(score: float, suspicious_threshold: float = 35.0, high_risk_threshold: float = 65.0) -> str:
    if score > high_risk_threshold:
        return "high_risk"
    if score >= suspicious_threshold:
        return "suspicious"
    return "verified"


@dataclass
class ScoreInputs:
    duplicate: DuplicateMatch | None
    classifier_probability: float | None
    anomaly_risk: float | None
    duplicate_floor: float
    cosine_threshold: float
    phash_threshold: float
    weights: dict[str, float]


def duplicate_risk(match: DuplicateMatch | None, floor: float, cosine_threshold: float, phash_threshold: float) -> float:
    if match is None:
        return 0.0
    # Cosine similarity on CNN embeddings is high for any two indoor photos; only the region
    # above `floor` should count as risk.
    cosine_component = clamp((match.cosine - floor) / max(1e-6, 1.0 - floor))
    phash_component = clamp((match.phash - 0.55) / max(1e-6, 1.0 - 0.55))
    risk = max(cosine_component, phash_component)
    if match.cosine >= cosine_threshold or match.phash >= phash_threshold:
        risk = 1.0
    return clamp(risk)


def combine_scores(inputs: ScoreInputs) -> float:
    weights = dict(inputs.weights)
    available: dict[str, float] = {
        "duplicate": duplicate_risk(
            inputs.duplicate, inputs.duplicate_floor, inputs.cosine_threshold, inputs.phash_threshold
        )
    }
    if inputs.classifier_probability is not None:
        available["classifier"] = clamp(inputs.classifier_probability)
    if inputs.anomaly_risk is not None:
        available["anomaly"] = clamp(inputs.anomaly_risk)

    # Redistribute the weight of missing signals (e.g. no trained classifier yet).
    total_weight = sum(weights[name] for name in available)
    if total_weight <= 0:
        return 0.0
    score = sum(available[name] * weights[name] for name in available) / total_weight
    return round(clamp(score) * 100, 2)


def build_reasons(
    duplicate: DuplicateMatch | None,
    classifier_probability: float | None,
    anomaly_reasons: list[str],
    cosine_threshold: float,
    phash_threshold: float,
    mode: str,
) -> list[str]:
    reasons: list[str] = []
    if duplicate is not None:
        similarity_pct = round(duplicate.similarity * 100)
        if duplicate.cosine >= cosine_threshold:
            reasons.append(
                f"A photo in this listing looks {similarity_pct}% similar to an existing listing "
                f"({duplicate.listing_id}). It may be a reused photo."
            )
        elif duplicate.phash >= phash_threshold:
            reasons.append(
                f"A photo is a near-exact visual match ({similarity_pct}%) of a photo in listing "
                f"{duplicate.listing_id}, even after resizing or recompression."
            )
        elif duplicate.similarity >= 0.75:
            reasons.append(
                f"A photo is somewhat similar ({similarity_pct}%) to listing {duplicate.listing_id}; "
                "please verify it shows this exact room."
            )

    if classifier_probability is not None and classifier_probability >= 0.5:
        reasons.append(
            f"Our trained image model thinks this photo set looks like stock or reused imagery "
            f"({round(classifier_probability * 100)}% confidence)."
        )

    reasons.extend(anomaly_reasons)

    if not reasons:
        if mode == "bootstrap":
            reasons.append("No reused photos or unusual listing details were found. Bootstrap checks only — a trained model is not active yet.")
        else:
            reasons.append("No reused photos, stock imagery or unusual listing details were found.")
    return reasons[:6]
