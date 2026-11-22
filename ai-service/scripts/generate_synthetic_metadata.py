#!/usr/bin/env python3
"""Generate the synthetic metadata CSV used to bootstrap the IsolationForest.

This is clearly-labelled demo data, not real listings. Retrain later with:
  POST /retrain {"metadataCsv": "data/real_metadata.csv"}
"""
from __future__ import annotations

import argparse
from pathlib import Path

from app.synthetic import write_synthetic_csv


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default=str(Path(__file__).resolve().parent.parent / "data" / "synthetic_metadata.csv"))
    parser.add_argument("--rows", type=int, default=1200)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    path = write_synthetic_csv(Path(args.output), n_rows=args.rows, seed=args.seed)
    print(f"Wrote {path} ({args.rows} synthetic rows, seed {args.seed})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
