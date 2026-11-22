"""Perceptual hashing as a second, complementary duplicate signal.

Embeddings catch visually similar scenes; pHash/dHash catch the same photo after
cropping, recompression or small edits. We report both and use the strongest one.
"""
from __future__ import annotations

import imagehash
from PIL import Image


def compute_hashes(image: Image.Image) -> dict[str, str]:
    rgb = image.convert("RGB")
    return {
        "phash": str(imagehash.phash(rgb, hash_size=8)),
        "dhash": str(imagehash.dhash(rgb, hash_size=8)),
    }


def hash_similarity(hash_a: str, hash_b: str) -> float:
    """Normalised Hamming similarity in [0, 1] for equal-length hex hashes."""
    if not hash_a or not hash_b or len(hash_a) != len(hash_b):
        return 0.0
    try:
        distance = imagehash.hex_to_hash(hash_a) - imagehash.hex_to_hash(hash_b)
    except ValueError:
        return 0.0
    bits = len(hash_a) * 4
    return max(0.0, 1.0 - (distance / bits))


def compare_hash_sets(a: list[dict[str, str]], b: list[dict[str, str]]) -> float:
    """Best pairwise similarity between two listings' hash sets."""
    best = 0.0
    for left in a:
        for right in b:
            best = max(
                best,
                hash_similarity(left.get("phash", ""), right.get("phash", "")),
                hash_similarity(left.get("dhash", ""), right.get("dhash", "")),
            )
    return best
