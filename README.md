# RentSaathi — AI-Powered Verified House/Room Rental Platform for Students

> **RentSaathi** (Urdu: *saathi* = companion) helps students in Pakistan find safe, verified rooms and
> helps landlords list them honestly. This monorepo contains the React website, Firebase backend,
> Cloud Functions and a **self-hosted** Python AI service that runs **our own models**. No OpenAI,
> Gemini, Google Vision, Hugging Face Inference or any other third-party AI API is called.

**Part 1 status:** complete website + AI Module 1 (fake and duplicate listing detection).
Price prediction, review authenticity and recommendations are contract-correct stubs for Parts 3/4.
The Flutter mobile app is a later part; the Firestore model and design tokens are already shared.

---

## 1. Repository layout

```
web/            React 19 + Vite + Tailwind website
                  public portal, auth, student area, landlord dashboard, admin console
functions/      Firebase Cloud Functions (Node 20): listing analysis pipeline
ai-service/     FastAPI + PyTorch/scikit-learn fraud detection service (Module 1)
dataset-tools/  Dataset collection helpers: organize, augment, stats
firebase/       Firestore rules + indexes, Storage rules
branding/       Original logo, generated icon/transparent assets, design tokens (tokens.json)
docs/           Data model, AI contracts, design system
dataset/        Local training data (git-ignored, .gitkeep only)
raw/            Raw collected photos (git-ignored, .gitkeep only)
```

Architecture:

```
Presentation      React website now, Flutter app later
Application       Firebase Auth, Firestore, Cloud Storage, Cloud Functions
AI layer          Self-hosted FastAPI service with our own weights
Data              Firestore, Cloud Storage, training dataset folder
```

Flow: a landlord saves a listing → `onListingWrite` calls the FastAPI service → the service returns
a fraud score → the Cloud Function writes `listings/{id}.ai` and, when needed, adds a
`flaggedQueue` document. The website, admin panel and (later) mobile app all read the same verdict.

---

## 2. What works in Part 1

### Website (`/web`)

* Public portal: home, searchable listings, filters (price, room type, gender rule, university,
  distance), sorting, pagination, list and map views, listing detail with photo gallery, map,
  landlord profile, AI trust badge/panel, fair-price placeholder, reviews, favourite button,
  contact/chat and visit request.
* Auth: email + password signup/login, role selection, password reset, profile page,
  role-based route guards. Phone OTP is not enabled yet (documented as optional).
* Student area: favourites, saved searches, visit requests, real-time chat inbox.
* Landlord dashboard: create/edit/delete/pause listings, multi-image upload with preview, map pin
  picker, facilities, rules, listing table with view/enquiry counts, document upload and
  verification status, AI analysis state, chats and visit requests.
* Admin console: landlord verification queue, AI-flagged listing queue with side-by-side duplicate
  comparison, approve/remove/suspend actions, user management, all listings, analytics with
  Recharts in the brand palette, model performance panel reading `GET /metrics`.
* Content pages: About, Safety, FAQ, Contact. 404 page, error boundary, skeletons, empty states,
  toasts, form validation, keyboard-accessible gallery, `prefers-reduced-motion` support.
* i18n structure with English and Urdu dictionaries and RTL direction switching. Only navigation
  and shared strings are translated now; content pages remain English until the Urdu copy is ready.
* Responsive mobile-first layout. The navbar uses the full logo; the icon-only asset is available
  for collapsed sidebars and tight mobile spaces.

### AI Module 1 (`/ai-service`)

* Pretrained CNN backbone (EfficientNet-B0 by default) with the classification head removed and
  L2-normalised embeddings.
* Duplicate/reused-photo detection: cosine similarity against an in-memory index (FAISS when
  available, numpy fallback) plus pHash/dHash as a second signal. Returns best match listing id and
  similarity.
* Bootstrap mode works with **zero training data**.
* Trained mode fine-tunes `genuine` vs `stock_or_reused` on `dataset/train|val|test`.
* Metadata anomaly detection with IsolationForest on price, area, price-per-sqft, image count,
  description length and owner posting frequency. A synthetic, clearly-labelled CSV is generated
  for bootstrap; a real CSV can be supplied later.
* Final 0–100 fraud score with configurable weights/thresholds and plain-English reasons.
* `evaluate.py` writes precision, recall, F1, ROC-AUC, confusion matrix and duplicate recall.
* Endpoints: `/analyze-listing`, `/index-listing`, `DELETE /index-listing/{id}`, `/health`,
  `/metrics`, `/retrain`, plus stubs `/predict-price`, `/analyze-review`, `/recommend`.

### Dataset tooling (`/dataset-tools`)

* Leakage-safe 70/15/15 split grouped by original image/source, not by file.
* Near-duplicate removal, resize, RGB JPEG conversion, class-count warnings.
* Realistic reused-photo augmentation (crop, flip, brightness/contrast, recompression, rotation,
  watermark/text overlay, screenshot border) that keeps variants in the same split.
* Duplicate-detection test set (`originals` / `variants`).
* Class balance, size and leakage report; exits non-zero on leakage.
* Legal/ethical collection guide, 3-member plan, labelling checklist and roadmap.

### Cloud Functions (`/functions`)

* `onListingWrite`: analyses new/changed listings, writes `ai` back, adds non-verified listings to
  `flaggedQueue`.
* `onListingDelete`: removes the listing from the AI image index.
* `rerunListingAnalysis`: admin callable to re-run analysis.
* `incrementListingView`: public callable used by the detail page so anonymous visitors never need
  write access to listings.
* `onChatCreate`: increments the listing enquiry count when a student starts a chat.
* Retry with exponential backoff and jitter, timeouts, structured logging, secrets from env.

---

## 3. Brand and design system

The logo is `branding/rentsaathi-logo.png` (crimson house + smiling figure, “Rent” in crimson over
“saathi” in brown). The committed pipeline `branding/make_assets.py` creates:

* transparent-background full logo (`branding/rentsaathi-logo-transparent.png`),
* square house-only icon (`branding/rentsaathi-icon.png`),
* copies in `web/src/assets/` and `web/public/`,
* favicon/PWA sizes and `web/public/manifest.webmanifest`.

The web app imports the generated assets; it never redraws the logo.

Design tokens are defined once in `web/tailwind.config.js`, mirrored as CSS variables in
`web/src/index.css`, and exported to `branding/tokens.json` for the Flutter app. Core values:

| Token | Value |
|---|---|
| primary (crimson) | `#A20224` |
| primary hover/dark | `#7D0119` |
| primary soft | `#FBE9ED` |
| secondary (brown) | `#764002` |
| secondary soft | `#F6EDE2` |
| background | `#FFFCFA` |
| surface | `#FFFFFF` |
| subtle section | `#FAF6F3` |
| text | `#2B1B14` |
| muted text | `#6B5B53` |
| border | `#EADFD8` |
| verified | `#2E7D32` |
| suspicious | `#B7791F` |
| high risk | `#C62828` |
| info | `#1F6F8B` |
| chart palette | `#A20224`, `#764002`, `#D9A066`, `#E8B4BD`, `#8C6D5A`, `#2E7D32` |

Status is always shown with an icon and text label, never colour alone. White text on `#A20224`
passes WCAG AA. Headings use Poppins, body uses Inter, both installed via `@fontsource` (no CDN).
The page title is `RentSaathi` and `<meta name="theme-color" content="#A20224">`.

---

## 4. Quick start without any keys (browser preview mode)

This is the fastest way to see the whole website. It uses bundled demo data and browser storage.

```bash
cd web
npm install
cp .env.example .env        # leave VITE_USE_EMULATORS=false
npm run dev
```

Open http://localhost:5173. Demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@rentsaathi.pk` | `RentSaathi123!` |
| Landlord 1 | `landlord1@rentsaathi.pk` | `RentSaathi123!` |
| Landlord 2 | `landlord2@rentsaathi.pk` | `RentSaathi123!` |
| Student 1 | `student1@rentsaathi.pk` | `RentSaathi123!` |
| Student 2 | `student2@rentsaathi.pk` | `RentSaathi123!` |

The login page also has one-click buttons for these accounts. In preview mode, accounts, listings,
favourites, chats and visit requests are stored in `localStorage`; they do not reach a server.

`VITE_DEMO_MODE=auto` (default) uses demo mode when Firebase is not configured. Set it to `false`
to force Firestore even with placeholder config.

---

## 5. Full local stack

### Prerequisites

* Node.js 20+ (the build was verified with Node 24)
* Python 3.10+ (the tests were verified with Python 3.13)
* Java 11+ for the Firebase Emulator Suite
* Firebase CLI: `npm install -g firebase-tools`
* Optional: Docker Desktop / Docker Engine for the AI service container
* Optional: Google Maps JavaScript API key for the interactive map

### 5.1 AI service (bootstrap mode, no dataset)

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs. Check:

```bash
curl http://localhost:8000/health
# {"status":"ok","mode":"bootstrap",...}
```

The first run downloads the pretrained EfficientNet-B0 weights (~20 MB) once. For an offline
machine, pre-cache them with `python scripts/prefetch_weights.py`.

### 5.2 Firebase Emulator Suite

```bash
# from the repository root
firebase emulators:start
```

This starts Auth (9099), Firestore (8080), Storage (9199), Functions (5001) and the Emulator UI
(4000). The config is in `firebase.json`; the default project alias is `rentsaathi-demo`.

Set the Cloud Functions environment in `functions/.env` (copy from `functions/.env.example`):

```dotenv
AI_SERVICE_URL=http://127.0.0.1:8000
AI_API_KEY=dev-local-key
AI_ENABLED=true
FUNCTIONS_REGION=asia-south1
AI_TIMEOUT_MS=15000
AI_MAX_RETRIES=3
```

For production, store `AI_API_KEY` as a secret:

```bash
firebase functions:secrets:set AI_API_KEY
```

### 5.3 Seed the emulators

```bash
cd web
npm run seed
```

The seed script creates 3 universities, 5 demo users (1 admin, 2 landlords, 2 students), 20
listings and demo chats/visits/reviews. Two or three listings deliberately reuse the same photos so
duplicate detection and the admin flagged queue can be demonstrated. It never writes a service
account file; production seeding requires `GOOGLE_APPLICATION_CREDENTIALS` and is opt-in with
`SEED_TARGET=production`.

### 5.4 Website against the emulators

```bash
cd web
cp .env.example .env
```

Set:

```dotenv
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=rentsaathi-demo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rentsaathi-demo
VITE_FIREBASE_STORAGE_BUCKET=rentsaathi-demo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:demo
VITE_USE_EMULATORS=true
VITE_AI_SERVICE_URL=http://127.0.0.1:8000
VITE_DEMO_MODE=false
```

Then:

```bash
npm run dev
```

The emulator-backed stack exercises real Auth, Firestore rules, Storage, Cloud Functions and the
FastAPI service. The public portal is also usable without signing in.

### 5.5 Docker (AI service)

```bash
cd ai-service
cp .env.example .env
docker compose up --build
```

The image uses CPU-only PyTorch wheels and honours `$PORT` for Render/Railway.

---

## 6. AI modes: bootstrap → collect → trained

`AI_MODE` controls the service:

| Value | Behaviour |
|---|---|
| `bootstrap` | duplicate detection + anomaly model; classifier skipped and its weight redistributed |
| `trained` | loads `models/image_cnn.pt` and includes the classifier probability |
| `auto` (default) | `trained` when `models/image_cnn.pt` exists, otherwise `bootstrap` |

Every response includes `mode`, so the website and admin panel can explain which checks ran.

### 6.1 Collect data

Read `dataset-tools/download_helper.md` first. It covers consent, free stock sources, public
indoor-scene datasets and academic use limits. **Do not scrape OLX, Facebook or Zameen** — their
terms forbid it. The guide includes a 3-member collection plan and labelling checklist.

Targets:

* Minimum viable: ~300 images per class (`genuine`, `stock_or_reused`).
* Good: 500–1,000 per class.
* Week 1: ~150 genuine + ~150 stock per member.
* Week 2: organise, remove duplicates, augment.
* Week 3: train, evaluate, inspect errors, retrain.

Put raw files in:

```
raw/genuine/*.jpg
raw/stock/*.jpg
```

### 6.2 Organise and augment

```bash
cd dataset-tools
pip install -r requirements.txt

python organize_dataset.py --raw ../raw --out ../dataset --clean
python augment_duplicates.py --dataset ../dataset --copies 3
python dataset_stats.py --dataset ../dataset
```

`organize_dataset.py` groups images by filename prefix **or** perceptual-hash distance and splits
whole groups 70/15/15. Augmented copies stay with their original split. `dataset_stats.py`
independently re-checks for leakage and exits non-zero if it finds any.

Result:

```
dataset/
  train/genuine/*.jpg
  train/stock_or_reused/*.jpg
  val/...
  test/...
  duplicate_test/originals/*.jpg
  duplicate_test/variants/*.jpg
  split_manifest.json
```

### 6.3 Train and evaluate

```bash
cd ai-service
source .venv/bin/activate
python train.py --data-dir ../dataset --epochs 12 --backbone efficientnet_b0
python evaluate.py --data-dir ../dataset
```

`train.py` freezes the backbone first (linear probe), then unfreezes the last block, uses strong
augmentation, class weights and early stopping. It warns when a class has fewer than 100 images.
`--cv 5` runs stratified 5-fold cross-validation on train+val.

`evaluate.py` writes `ai-service/reports/metrics.json` and `confusion_matrix.png`, and reports
duplicate-detection recall on the original/variant test pairs. Do not claim accuracy the dataset
cannot support; the service and admin panel show “No trained model yet” until metrics exist.

### 6.4 Switch to trained mode

```bash
# models/image_cnn.pt now exists
AI_MODE=trained uvicorn app.main:app --port 8000
# or leave AI_MODE=auto and restart
```

`GET /metrics` then returns the latest metrics file and the admin analytics panel renders precision,
recall, F1, ROC-AUC and the confusion matrix. To retrain only the metadata IsolationForest from a
real CSV:

```bash
curl -X POST http://localhost:8000/retrain \
  -H "X-API-KEY: $AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"metadataCsv": "data/real_metadata.csv"}'
```

The CSV must live inside `DATA_DIR` (path-traversal guard).

---

## 7. Keys and secrets you must create

Nothing in the repository contains a real key. Copy the `.env.example` files and fill them in.

### Firebase

1. Create a Firebase project at https://console.firebase.google.com.
2. Enable **Authentication → Email/Password**.
3. Create **Firestore Database** (production mode) and **Storage**.
4. Add a **Web app** and copy the config values into `web/.env`:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
   optional `VITE_FIREBASE_MEASUREMENT_ID`.
5. Update `.firebaserc` with your project id, or run `firebase use --add`.
6. Deploy rules and indexes:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

7. Set the Cloud Functions secret:

   ```bash
   firebase functions:secrets:set AI_API_KEY
   ```

8. Deploy functions after the AI service URL is public:

   ```bash
   # set AI_SERVICE_URL in functions/.env or the Functions environment
   firebase deploy --only functions
   ```

### Google Maps (optional)

1. In Google Cloud Console enable **Maps JavaScript API**.
2. Create an API key and restrict it to your web domains and the Maps JavaScript API.
3. Put it in `web/.env` as `VITE_GOOGLE_MAPS_API_KEY`.

Without a key the map shows a styled area preview with primary-coloured pins. Listing creation
falls back to latitude/longitude inputs and city quick-picks. No Google request is made.

### AI service

`ai-service/.env`:

```dotenv
AI_MODE=auto
AI_API_KEY=change-me-to-a-long-random-string
CORS_ORIGINS=https://your-web-domain.example
```

Use the same value for `AI_API_KEY` in `functions/.env` / the Functions secret.

### What must never be committed

`.env*` (except `.env.example`), `serviceAccount*.json`, `firebase-adminsdk*.json`, `*.pem`,
datasets (`dataset/`, `raw/`), model weights (`models/*.pt`, `*.pth`, `*.onnx`) and `node_modules`.
These are covered by `.gitignore`. If a model file must be shared, use Git LFS and document the
download separately; do not commit it to normal git history.

---

## 8. Testing and verification

Run all suites:

```bash
# Web (Vitest + Testing Library)
cd web && npm test

# Production build
npm run build

# AI service
cd ../ai-service && python -m pytest

# Dataset tools (includes the no-leakage test)
cd ../dataset-tools && python -m pytest

# Cloud Functions
cd ../functions && npm test
```

Current status in this environment:

* `web`: 4 test files, 13 tests passing; `npm run build` succeeds.
* `ai-service`: 33 tests passing (scoring, duplicate search, embeddings, anomaly, classifier,
  API contracts, auth, stubs, retrain path guard).
* `dataset-tools`: 7 tests passing, including the split/augmentation no-leakage assertions.
* `functions`: 8 tests passing (retry policy, index deletion, analysis triggers, metadata).
* Browser QA covered home, listings (list/map), listing detail, login for all roles, student
  favourites/visits/chats, landlord listings/verification/visits/chats, admin verification,
  flagged queue and analytics, 404 and Urdu RTL navigation.

**Not run in this sandbox:** Docker image build (Docker daemon unavailable), Firebase Emulator
Suite (Firebase CLI not installed), real Firebase project deployment, and Google Maps rendering
(no key). Their configuration and unit-level behaviour are covered by tests and `npm run build`.

---

## 9. Deployment

### Website

```bash
cd web
npm run build          # outputs web/dist
firebase deploy --only hosting
```

Add a Hosting section to `firebase.json` if you want Firebase Hosting:

```json
"hosting": { "public": "web/dist", "ignore": ["firebase.json", "**/.*", "**/node_modules/**"] }
```

For Vercel/Netlify, set the build command to `npm run build`, output `dist`, and add the
`VITE_*` variables in the dashboard. Never put secrets in frontend variables; only public Firebase
config and the Maps key belong there.

### AI service

The included Dockerfile works on Render/Railway/Fly.io:

```bash
docker build -t rentsaathi-ai .
docker run -p 8000:8000 --env-file .env rentsaathi-ai
```

Set `AI_API_KEY`, `CORS_ORIGINS` and `AI_MODE` in the platform environment. Point
`AI_SERVICE_URL` in Cloud Functions at the public HTTPS URL. Keep the service private if possible;
the shared `X-API-KEY` is the minimum protection.

### Firestore / Storage

Deploy rules and indexes before opening signup:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

## 10. Interfaces for next parts

The exact request/response bodies are frozen in `docs/ai-service-contracts.md` and implemented in
`ai-service/app/schemas.py`. The website already reserves the Firestore fields.

### `POST /predict-price` — Part 3 (stub)

Request:

```json
{
  "listingId": "string|null",
  "metadata": {
    "city": "Gujrat",
    "roomType": "single",
    "areaSqft": 400,
    "facilities": ["wifi"],
    "universityId": "ug-gujrat"
  }
}
```

Current response:

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

Future response keeps `status: "ok"` and fills `prediction.min`, `prediction.max` and
`prediction.flag` (`"fair" | "below" | "above" | "unknown"`). Reserved Firestore field:
`listings/{id}.aiFairPrice: {min, max, flag}`. The website’s fair-price card reads this field.

### `POST /analyze-review` — Part 4 (stub)

Request:

```json
{ "reviewId": "string|null", "listingId": "string|null", "text": "review body" }
```

Current response:

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

Future: `authenticityScore` 0–100 and `label` `"authentic" | "suspicious" | "fake"`. Reserved
fields: `reviews/{id}.ai: {authenticityScore, label}` and
`listings/{id}.reviewStats: {count, average, fakeCount}`.

### `POST /recommend` — Part 4 (stub)

Request:

```json
{ "studentId": "string|null", "favorites": ["listingId"], "limit": 6 }
```

Current response:

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

Future: `recommendations: [{ "listingId": "...", "score": 0.87, "reason": "..." }]`. Reserved
field: `listings/{id}.recommendationTags: string[]` (optional cache).

### Shared Firestore contract

See `docs/data-model.md` for every collection. Key reserved fields:

* `listings.ai` — Module 1 verdict (implemented).
* `listings.aiFairPrice` — Part 3.
* `listings.reviewStats`, `reviews.ai` — Part 4.
* `imageEmbeddings/{listingId}` — embeddings/phashes for duplicate search.
* `flaggedQueue/{id}` — admin moderation queue.

---

## 11. Manual steps after cloning

1. **Create a Firebase project** and enable Email/Password auth, Firestore and Storage.
2. **Copy the web config** into `web/.env` from Firebase Project settings → Your apps → Web app.
3. **Set `VITE_USE_EMULATORS=false`** for a real project, or `true` while running
   `firebase emulators:start`.
4. **Deploy rules/indexes** with `firebase deploy --only firestore:rules,firestore:indexes,storage`.
5. **Create the AI service** (`ai-service/.env`), run it, and set `AI_SERVICE_URL` +
   `AI_API_KEY` for Cloud Functions. Store the key with `firebase functions:secrets:set AI_API_KEY`.
6. **Deploy functions** with `firebase deploy --only functions`.
7. **Optional:** add `VITE_GOOGLE_MAPS_API_KEY` after enabling Maps JavaScript API.
8. **Collect the dataset** following `dataset-tools/download_helper.md`; organize, augment, train
   and evaluate. Switch `AI_MODE=trained` only after metrics exist.
9. **Replace demo content** (listings, universities, contact details) before a public launch.
10. **Do not commit** `.env` files, service account JSON, datasets or model weights.

---

## 12. Known limitations in Part 1

* Parts 2–4 AI models are stubs by design.
* Flutter app is not built yet; it can reuse `branding/tokens.json` and `docs/data-model.md`.
* Phone OTP is not enabled (email/password only).
* The embedding index is in memory and rebuilt by re-indexing after a restart.
* Urdu translations cover navigation and shared strings; long-form content is still English.
* Demo mode stores data in the browser only. It is for previews, not multi-user testing.
* No transactional email templates or provider are wired yet; the logo usage rule for future email templates is in `docs/design-system.md`.
* No production backup/retention policy is configured for Firestore or Storage.
