# RentSaathi Cloud Functions

Node.js 20 functions that connect Firestore listings to the self-hosted AI service.

## Functions

| Function | Trigger | What it does |
|---|---|---|
| `onListingWrite` | Firestore `listings/{listingId}` create/update | Calls `POST /analyze-listing`, writes the `ai` map back, adds/updates `flaggedQueue` when the label is not `verified`, and indexes embeddings (`POST /index-listing`). Skips writes that only touch `ai`. |
| `onListingDelete` | Firestore delete | `DELETE /index-listing/{id}`, removes `imageEmbeddings/{id}` and the flag queue doc. |
| `rerunListingAnalysis` | Callable (admin only) | Re-runs analysis for one listing and returns the verdict. Admin = custom claim `admin: true` or `users/{uid}.role == "admin"`. |

Retries: `AIClient` retries network errors, 429 and 5xx up to 3 times with exponential backoff and
jitter (500 ms → 8 s). Timeout per attempt: 15 s. Firestore triggers also have `retry: true`.

## Setup

```bash
cd functions
npm install
cp .env.example .env      # edit AI_SERVICE_URL and AI_API_KEY
npm run serve             # emulators (functions + firestore + auth + storage)
npm run deploy            # after `firebase login` and a real project
```

`AI_SERVICE_URL`:
* local emulator + local AI: `http://127.0.0.1:8000`
* deployed: your Render/Railway URL, e.g. `https://rentsaathi-ai.onrender.com`

`AI_API_KEY` must match the AI service's `AI_API_KEY`. For production use a secret manager or
`firebase functions:secrets:set AI_API_KEY`; never commit `.env`.

## What is written

`listings/{id}.ai`:
```json
{
  "fraudScore": 78.4,
  "fraudLabel": "high_risk",
  "duplicateOf": "listing-a",
  "duplicateSimilarity": 0.98,
  "reasons": ["..."],
  "mode": "bootstrap",
  "modelVersion": "bootstrap-embed-efficientnet_b0-pretrained-v1",
  "analyzedAt": "<server timestamp>"
}
```

`flaggedQueue/flag_{listingId}` for `suspicious` / `high_risk` listings (kept until an admin
approves or removes the listing).

## Tests

```bash
npm test
```

8 unit tests cover the AI client retry policy, auth header, 4xx behaviour, URL encoding, the
"only AI fields changed" guard, metadata building and URL validation. They run without Firebase or
network access (a local HTTP server stands in for the AI service).
