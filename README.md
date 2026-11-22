# RentSaathi — AI-Powered Verified House/Room Rental Platform for Students

> RentSaathi (Urdu: *saathi* = companion) helps students in Pakistan find safe, verified rooms and
> helps landlords list them honestly. It is a monorepo with a React website, Firebase backend,
> and a self-hosted Python AI service that runs **our own models** (no third-party AI APIs).

**Part 1 status:** full website + AI Module 1 (image fake/duplicate listing detection) implemented.
Price prediction, review authenticity, and recommendations are contract-correct stubs for Parts 3/4.

## Repository layout

```
web/            React 18 + Vite + Tailwind website (public portal, student, landlord, admin)
functions/      Firebase Cloud Functions (Node 20) — listing analysis pipeline
ai-service/     FastAPI + PyTorch/scikit-learn fraud detection service (Module 1)
dataset-tools/  Dataset collection helpers: organize, augment, stats
firebase/       Firestore rules + indexes, Storage rules, emulator config
branding/       Logo, generated brand assets, design tokens (tokens.json)
docs/           Data model, AI service contracts, manual setup guide
```

Detailed documentation is added in Phase 8 below (local setup, bootstrap mode, dataset workflow,
training, deployment, interfaces for next parts).
