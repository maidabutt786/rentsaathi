from pathlib import Path

from app.anomaly import MetadataAnomalyDetector
from app.schemas import ListingMetadata
from app.synthetic import generate_rows


def test_synthetic_generator_is_deterministic_and_labelled() -> None:
    first = generate_rows(300, seed=7)
    second = generate_rows(300, seed=7)
    assert first.equals(second)
    assert set(["price", "areaSqft", "price_per_sqft", "is_anomaly"]).issubset(first.columns)
    assert 0 < first["is_anomaly"].mean() < 0.2


def test_anomaly_model_flags_extreme_listing(tmp_path: Path) -> None:
    detector = MetadataAnomalyDetector(tmp_path / "iforest.pkl", tmp_path / "synthetic.csv")
    rows = detector.train(generate_rows(900, seed=11))
    assert rows == 900

    normal = ListingMetadata(
        price=19000,
        areaSqft=420,
        imageCount=6,
        descriptionLength=400,
        ownerPostingFrequency=2,
    )
    extreme = ListingMetadata(
        price=800,
        areaSqft=30,
        imageCount=1,
        descriptionLength=2,
        ownerPostingFrequency=60,
    )
    normal_result = detector.score(normal)
    extreme_result = detector.score(extreme)

    assert normal_result.risk is not None and extreme_result.risk is not None
    assert extreme_result.risk > normal_result.risk
    assert extreme_result.risk > 0.7
    assert any("low" in reason or "high" in reason for reason in extreme_result.reasons)


def test_anomaly_model_persists_and_reloads(tmp_path: Path) -> None:
    model_path = tmp_path / "iforest.pkl"
    detector = MetadataAnomalyDetector(model_path, tmp_path / "synthetic.csv")
    detector.train(generate_rows(400, seed=3))
    assert model_path.exists()

    reloaded = MetadataAnomalyDetector(model_path, tmp_path / "synthetic.csv")
    assert reloaded.load() is True
    result = reloaded.score(ListingMetadata(price=20000, areaSqft=400, imageCount=5, descriptionLength=300))
    assert result.risk is not None


def test_missing_metadata_returns_no_anomaly_risk(tmp_path: Path) -> None:
    detector = MetadataAnomalyDetector(tmp_path / "iforest.pkl", tmp_path / "synthetic.csv")
    detector.ensure_ready()
    assert detector.score(ListingMetadata(price=None, areaSqft=None)).risk is None
