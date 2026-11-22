from app.index import DuplicateMatch
from app.scoring import ScoreInputs, build_reasons, combine_scores, duplicate_risk, label_for_score

WEIGHTS = {"duplicate": 0.45, "classifier": 0.35, "anomaly": 0.20}


def test_label_thresholds_are_inclusive_at_suspicious() -> None:
    assert label_for_score(0) == "verified"
    assert label_for_score(34.99) == "verified"
    assert label_for_score(35) == "suspicious"
    assert label_for_score(65) == "suspicious"
    assert label_for_score(65.01) == "high_risk"
    assert label_for_score(100) == "high_risk"


def test_duplicate_risk_scales_above_floor() -> None:
    low = DuplicateMatch(listing_id="a", cosine=0.70, phash=0.5, image_index=0)
    high = DuplicateMatch(listing_id="a", cosine=0.97, phash=0.5, image_index=0)
    assert duplicate_risk(low, 0.72, 0.92, 0.86) == 0.0
    assert duplicate_risk(high, 0.72, 0.92, 0.86) == 1.0


def test_phash_match_counts_even_when_cosine_is_moderate() -> None:
    match = DuplicateMatch(listing_id="a", cosine=0.80, phash=0.95, image_index=0)
    assert duplicate_risk(match, 0.72, 0.92, 0.86) >= 0.85


def test_bootstrap_redistributes_classifier_weight() -> None:
    inputs = ScoreInputs(
        duplicate=None,
        classifier_probability=None,
        anomaly_risk=1.0,
        duplicate_floor=0.72,
        cosine_threshold=0.92,
        phash_threshold=0.86,
        weights=WEIGHTS,
    )
    # No duplicate and no classifier: the anomaly weight (0.20) is normalised over the
    # remaining 0.65 of available weight -> 30.77, not a full 100.
    assert combine_scores(inputs) == 30.77


def test_weighted_combination() -> None:
    inputs = ScoreInputs(
        duplicate=DuplicateMatch(listing_id="a", cosine=0.97, phash=0.5, image_index=0),
        classifier_probability=0.5,
        anomaly_risk=0.5,
        duplicate_floor=0.72,
        cosine_threshold=0.92,
        phash_threshold=0.86,
        weights=WEIGHTS,
    )
    # 1.0*0.45 + 0.5*0.35 + 0.5*0.20 = 0.725 -> 72.5
    assert combine_scores(inputs) == 72.5


def test_reasons_are_plain_english_and_mention_duplicate() -> None:
    match = DuplicateMatch(listing_id="listing-42", cosine=0.98, phash=0.9, image_index=0)
    reasons = build_reasons(match, 0.8, ["The monthly rent is unusually low."], 0.92, 0.86, "bootstrap")
    joined = " ".join(reasons)
    assert "listing-42" in joined
    assert "reused" in joined.lower() or "similar" in joined.lower()
    assert "monthly rent" in joined


def test_reasons_explain_bootstrap_mode_when_clean() -> None:
    reasons = build_reasons(None, None, [], 0.92, 0.86, "bootstrap")
    assert len(reasons) == 1
    assert "Bootstrap" in reasons[0]
