import json

from fastapi.testclient import TestClient

from tests.conftest import FakeFetcher, make_image


def payload(listing_id: str, url: str = "https://img.test/room.jpg") -> dict:
    return {
        "listingId": listing_id,
        "imageUrls": [url],
        "metadata": {
            "price": 18000,
            "areaSqft": 400,
            "imageCount": 1,
            "descriptionLength": 350,
            "ownerPostingFrequency": 2,
            "roomType": "single",
            "city": "Gujrat",
        },
    }


def test_health_is_public(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["mode"] == "bootstrap"
    assert body["classifierLoaded"] is False
    assert body["indexBackend"] in {"faiss", "numpy"}


def test_analyze_requires_api_key(client: TestClient) -> None:
    assert client.post("/analyze-listing", json=payload("l1")).status_code == 401
    wrong = client.post("/analyze-listing", json=payload("l1"), headers={"X-API-KEY": "nope"})
    assert wrong.status_code == 401


def test_analyze_contract(client: TestClient, fetcher: FakeFetcher, auth_headers: dict) -> None:
    fetcher.add("https://img.test/room.jpg", make_image((180, 150, 120), pattern=1))
    response = client.post("/analyze-listing", json=payload("l1"), headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["fraudScore"] <= 100
    assert body["fraudLabel"] in {"verified", "suspicious", "high_risk"}
    assert body["mode"] == "bootstrap"
    assert body["modelVersion"].startswith("bootstrap-")
    assert isinstance(body["reasons"], list) and body["reasons"]
    assert body["duplicateOf"] is None
    assert body["duplicateSimilarity"] == 0.0


def test_duplicate_listing_is_detected(
    client: TestClient, fetcher: FakeFetcher, auth_headers: dict
) -> None:
    fetcher.add("https://img.test/same.jpg", make_image((30, 90, 160), pattern=1))
    indexed = client.post(
        "/index-listing",
        json={"listingId": "listing-a", "imageUrls": ["https://img.test/same.jpg"]},
        headers=auth_headers,
    )
    assert indexed.status_code == 200
    assert indexed.json()["indexed"] is True

    response = client.post(
        "/analyze-listing",
        json=payload("listing-b", "https://img.test/same.jpg"),
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["duplicateOf"] == "listing-a"
    assert body["duplicateSimilarity"] > 0.95
    assert body["fraudLabel"] in {"suspicious", "high_risk"}
    assert body["fraudScore"] >= 35


def test_listing_never_matches_itself(
    client: TestClient, fetcher: FakeFetcher, auth_headers: dict
) -> None:
    fetcher.add("https://img.test/self.jpg", make_image((70, 140, 70), pattern=1))
    client.post(
        "/index-listing",
        json={"listingId": "listing-self", "imageUrls": ["https://img.test/self.jpg"]},
        headers=auth_headers,
    )
    body = client.post(
        "/analyze-listing", json=payload("listing-self", "https://img.test/self.jpg"), headers=auth_headers
    ).json()
    assert body["duplicateOf"] is None


def test_index_delete_and_missing_image(
    client: TestClient, fetcher: FakeFetcher, auth_headers: dict
) -> None:
    fetcher.add("https://img.test/a.jpg", make_image((10, 10, 10)))
    assert client.post(
        "/index-listing", json={"listingId": "l1", "imageUrls": ["https://img.test/a.jpg"]}, headers=auth_headers
    ).status_code == 200
    assert client.delete("/index-listing/l1", headers=auth_headers).json()["deleted"] is True
    assert client.delete("/index-listing/l1", headers=auth_headers).json()["deleted"] is False

    missing = client.post(
        "/index-listing", json={"listingId": "l2", "imageUrls": ["https://img.test/missing.jpg"]}, headers=auth_headers
    )
    assert missing.status_code == 422


def test_analyze_without_photos_explains_itself(
    client: TestClient, auth_headers: dict
) -> None:
    body = client.post(
        "/analyze-listing",
        json={"listingId": "l3", "imageUrls": [], "metadata": {"price": 12000, "areaSqft": 300}},
        headers=auth_headers,
    ).json()
    assert any("no photos" in reason.lower() for reason in body["reasons"])


def test_metrics_unavailable_in_bootstrap(client: TestClient) -> None:
    body = client.get("/metrics").json()
    assert body == {"available": False, "mode": "bootstrap"}


def test_metrics_available_when_file_exists(client: TestClient, service) -> None:
    service.settings.metrics_path.parent.mkdir(parents=True, exist_ok=True)
    service.settings.metrics_path.write_text(json.dumps({"classifier": {"f1": 0.9}}))
    body = client.get("/metrics").json()
    assert body["available"] is True
    assert body["classifier"]["f1"] == 0.9


def test_retrain_endpoint_and_path_traversal_guard(
    client: TestClient, auth_headers: dict
) -> None:
    body = client.post("/retrain", json={}, headers=auth_headers).json()
    assert body["retrained"] is True
    assert body["rows"] > 0

    blocked = client.post("/retrain", json={"metadataCsv": "../../etc/passwd"}, headers=auth_headers)
    assert blocked.status_code == 422


def test_stub_contracts(client: TestClient, auth_headers: dict) -> None:
    price = client.post("/predict-price", json={"listingId": "l1", "metadata": {}}, headers=auth_headers).json()
    assert price["status"] == "not_implemented"
    assert price["part"].startswith("Part 3")
    assert "NOT IMPLEMENTED YET" in price["message"]
    assert price["prediction"]["currency"] == "PKR"

    review = client.post("/analyze-review", json={"text": "great room"}, headers=auth_headers).json()
    assert review["status"] == "not_implemented"
    assert review["authenticityScore"] is None

    rec = client.post("/recommend", json={"favorites": ["a"], "limit": 3}, headers=auth_headers).json()
    assert rec["status"] == "not_implemented"
    assert rec["recommendations"] == []

    assert client.post("/predict-price", json={}).status_code == 401


def test_invalid_image_url_rejected(client: TestClient, auth_headers: dict) -> None:
    response = client.post(
        "/analyze-listing",
        json={"listingId": "l1", "imageUrls": ["file:///etc/passwd"], "metadata": {}},
        headers=auth_headers,
    )
    assert response.status_code == 422
