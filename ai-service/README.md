# RentSaathi AI service

FastAPI service that hosts **our own** fraud-detection models. No OpenAI, Gemini, Google Vision,
Hugging Face Inference or any other third-party AI API is called — the CNN runs locally with
torchvision weights.

Module 1 (this part): **fake & duplicate listing detection**
* CNN embeddings + cosine search for reused photos
* pHash/dHash as a second duplicate signal
* optional fine-tuned `genuine` vs `stock_or_reused` classifier (Stage C)
* IsolationForest metadata anomaly detection (price, area, price/sqft, image count, description
  length, owner posting frequency)
* weighted 0–100 fraud score with plain-English reasons

Price, review and recommendation endpoints are **contract-correct stubs** for Parts 3/4.

## Quick start (bootstrap mode, no dataset)

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs. `GET /health` should report `"mode": "bootstrap"`.

The first health/analyze call downloads the EfficientNet-B0 weights (~20 MB) once. Offline
installations can pre-cache them with `python scripts/prefetch_weights.py`.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | mode, model version, index size |
| GET | `/metrics` | none | latest `reports/metrics.json` or `{"available": false, "mode": ...}` |
| POST | `/analyze-listing` | `X-API-KEY` | fraud score for a listing |
| POST | `/index-listing` | `X-API-KEY` | store embeddings for duplicate matching |
| DELETE | `/index-listing/{id}` | `X-API-KEY` | remove embeddings |
| POST | `/retrain` | `X-API-KEY` | retrain the metadata IsolationForest |
| POST | `/predict-price` | `X-API-KEY` | **stub** (Part 3) |
| POST | `/analyze-review` | `X-API-KEY` | **stub** (Part 4) |
| POST | `/recommend` | `X-API-KEY` | **stub** (Part 4) |

`/health` and `/metrics` are intentionally unauthenticated so a load balancer and the admin panel
can read them; they expose no user data. Everything that costs CPU or mutates state requires the key.

### Analyze request / response

```json
// POST /analyze-listing
{
  "listingId": "abc123",
  "imageUrls": ["https://storage.googleapis.com/.../room1.jpg"],
  "metadata": {
    "price": 18000, "areaSqft": 400, "imageCount": 6,
    "descriptionLength": 420, "ownerPostingFrequency": 2,
    "roomType": "single", "city": "Gujrat"
  }
}
```

```json
{
  "fraudScore": 78.4,
  "fraudLabel": "high_risk",
  "duplicateOf": "listing-a",
  "duplicateSimilarity": 0.98,
  "reasons": ["A photo in this listing looks 98% similar to an existing listing (listing-a)..."],
  "mode": "bootstrap",
  "modelVersion": "bootstrap-embed-efficientnet_b0-pretrained-v1",
  "analyzedAt": "2026-11-22T11:47:00+00:00"
}
```

Labels: `verified` < 35, `suspicious` 35–65, `high_risk` > 65 (configurable).

## Modes

| `AI_MODE` | Behaviour |
|---|---|
| `bootstrap` (default when no weights) | duplicate detection + anomaly model; classifier skipped and its weight redistributed |
| `trained` | loads `models/image_cnn.pt` and includes the classifier probability |
| `auto` | `trained` as soon as `models/image_cnn.pt` exists, otherwise `bootstrap` |

## Training the image classifier (Stage C)

```bash
# from ai-service/, after dataset-tools produced ../dataset
python train.py --data-dir ../dataset --epochs 12 --backbone efficientnet_b0
python evaluate.py --data-dir ../dataset
```

`train.py` uses a frozen backbone first (linear probe), then unfreezes the last block, applies
strong augmentation, class weights and early stopping. It warns when a class has fewer than 100
images. `--cv 5` runs stratified 5-fold cross-validation on train+val.

`evaluate.py` writes `reports/metrics.json` (precision, recall, F1, ROC-AUC, confusion matrix) and
`reports/confusion_matrix.png`. It also evaluates duplicate recall on
`dataset/duplicate_test/{originals,variants}` pairs. `GET /metrics` then feeds the admin panel.

Restart the service after training; `AI_MODE=auto` picks the checkpoint up automatically.

## Metadata anomaly model

At first start the service generates `data/synthetic_metadata.csv` (1200 clearly-labelled demo
rows) and trains the IsolationForest on it. To use real data, place a CSV with the same columns
(without `is_anomaly`) in `data/` and call:

```bash
curl -X POST http://localhost:8000/retrain \
  -H "X-API-KEY: $AI_API_KEY" -H "Content-Type: application/json" \
  -d '{"metadataCsv": "data/real_metadata.csv"}'
```

## Security

* `X-API-KEY` shared secret (`AI_API_KEY`), compared in constant time.
* CORS restricted to `CORS_ORIGINS`.
* Image downloads: 8 s timeout, 6 MB cap, `image/*` content type, decompression-bomb limit.
* Max 15 images analysed per listing.
* `metadataCsv` for retraining must live inside `DATA_DIR` (path traversal guard).

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The Dockerfile uses CPU-only PyTorch wheels and bakes the pretrained backbone into the image.
It works on Render/Railway: they set `$PORT`, which the container honours.

## Tests

```bash
cd ai-service && python -m pytest
```

33 tests cover scoring thresholds/weights, duplicate search (cosine + pHash), the real CNN
embedding code path (random weights, no download), anomaly training/scoring, classifier checkpoint
round-trip, and every API contract including auth, stubs and the retrain path guard.

## What is not implemented yet

* Price regression, review authenticity and recommender models (stubs only).
* Persistence of the embedding index across restarts (in-memory by design for Part 1; rebuild by
  re-indexing listings).
* Real dataset — see `../dataset-tools/download_helper.md`.
