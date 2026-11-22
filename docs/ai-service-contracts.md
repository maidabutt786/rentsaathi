# AI service contracts (frozen for Parts 3/4)

The website and Cloud Functions already call these shapes. Later parts implement the models without
changing the JSON.

## Implemented: `POST /analyze-listing`

Request:
```json
{
  "listingId": "string",
  "imageUrls": ["https://..."],
  "metadata": {
    "price": 18000,
    "areaSqft": 400,
    "imageCount": 6,
    "descriptionLength": 420,
    "ownerPostingFrequency": 2,
    "roomType": "single",
    "city": "Gujrat"
  }
}
```
Response: see `AnalyzeListingResponse` in `ai-service/app/schemas.py`. The Cloud Function writes this
object into `listings/{id}.ai` (plus `analyzedAt`).

## Stub: `POST /predict-price` (Part 3)

Request:
```json
{ "listingId": "string|null", "metadata": { "city": "Gujrat", "roomType": "single", "areaSqft": 400, "facilities": ["wifi"], "universityId": "u1" } }
```
Response now:
```json
{
  "status": "not_implemented",
  "part": "Part 3 — fair price regression",
  "message": "NOT IMPLEMENTED YET (Part 3)...",
  "mode": "bootstrap",
  "model": "fair_price_regression",
  "prediction": { "min": null, "max": null, "currency": "PKR", "flag": "unknown" }
}
```
Future response keeps `status: "ok"` and fills `prediction.min`, `prediction.max`,
`prediction.flag` (`"fair" | "below" | "above" | "unknown"`). The Cloud Function writes it to
`listings/{id}.aiFairPrice` and the website renders the "Fair price" card.

## Stub: `POST /analyze-review` (Part 4)

Request:
```json
{ "reviewId": "string|null", "listingId": "string|null", "text": "review body" }
```
Response now:
```json
{
  "status": "not_implemented",
  "part": "Part 4 — fake review NLP",
  "message": "NOT IMPLEMENTED YET (Part 4)...",
  "mode": "bootstrap",
  "model": "review_authenticity",
  "authenticityScore": null,
  "label": "unknown"
}
```
Future: `authenticityScore` 0–100, `label` `"authentic" | "suspicious" | "fake"`. Stored in
`reviews/{id}.ai` and aggregated into `listings/{id}.reviewStats`.

## Stub: `POST /recommend` (Part 4)

Request:
```json
{ "studentId": "string|null", "favorites": ["listingId"], "limit": 6 }
```
Response now:
```json
{
  "status": "not_implemented",
  "part": "Part 4 — content-based recommender",
  "message": "NOT IMPLEMENTED YET (Part 4)...",
  "mode": "bootstrap",
  "model": "content_recommender",
  "recommendations": []
}
```
Future: `recommendations: [{ "listingId": "...", "score": 0.87, "reason": "..." }]`.

## Reserved Firestore fields

* `listings.aiFairPrice: {min, max, flag}`
* `listings.reviewStats: {count, average, fakeCount}`
* `reviews.ai: {authenticityScore, label}`
* `listings.recommendationTags: string[]` (optional cache)
