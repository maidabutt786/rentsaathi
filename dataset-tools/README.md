# RentSaathi dataset tools

Helpers for the three-stage AI plan: **bootstrap → collect → trained**. No dataset is committed to
git; only these tools are.

## Install

```bash
cd dataset-tools
pip install -r requirements.txt
```

## Workflow

```bash
# 1. Put photos in ../raw/genuine and ../raw/stock (see download_helper.md)
# 2. Leakage-safe 70/15/15 split (groups stay together)
python organize_dataset.py --raw ../raw --out ../dataset --clean

# 3. Create reused-photo variants + duplicate-detection test pairs
python augment_duplicates.py --dataset ../dataset --copies 3

# 4. Inspect balance, sizes, duplicates and leakage
python dataset_stats.py --dataset ../dataset
```

Then train from `ai-service/`:

```bash
python train.py --data-dir ../dataset --epochs 12
python evaluate.py --data-dir ../dataset
```

## Scripts

| Script | What it does |
|---|---|
| `organize_dataset.py` | Groups images by filename prefix + perceptual hash, splits whole groups 70/15/15, removes near-duplicates inside a group, resizes to 1024 px, writes `split_manifest.json`. |
| `augment_duplicates.py` | Creates crop/flip/brightness/recompression/rotation/watermark/screenshot variants of genuine photos in the **same split**, rejects any variant that would be a near-duplicate of an image in another split, and builds `dataset/duplicate_test/{originals,variants}`. |
| `dataset_stats.py` | Class balance, image sizes, duplicate clusters, cross-split leakage; exits 1 on leakage. |
| `download_helper.md` | Legal/ethical collection guide, 3-member plan, labelling checklist, roadmap. |

## Why grouping matters

A random split leaks: the same room (or an augmented copy) can appear in train and test, inflating
accuracy. `organize_dataset.py` unions images that share a filename prefix **or** are within a
perceptual-hash distance (default 8), then splits whole groups. `dataset_stats.py` re-checks the
result independently and fails on leakage.

## Tests

```bash
cd dataset-tools && python -m pytest
```

The suite builds synthetic raw images, runs the real organize/augment/stats code, and asserts that
no group or near-duplicate crosses splits (including after augmentation).
