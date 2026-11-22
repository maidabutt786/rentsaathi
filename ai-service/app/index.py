"""In-memory embedding index for duplicate detection.

Small scale by design (a campus marketplace): a few thousand listings. We use FAISS when it is
installed and fall back to a plain NumPy matrix otherwise, so the service always works.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass

import numpy as np

from .hashing import compare_hash_sets

try:  # optional acceleration
    import faiss  # type: ignore

    FAISS_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on environment
    faiss = None  # type: ignore
    FAISS_AVAILABLE = False


@dataclass
class DuplicateMatch:
    listing_id: str
    cosine: float
    phash: float
    image_index: int

    @property
    def similarity(self) -> float:
        return max(self.cosine, self.phash)


class EmbeddingIndex:
    def __init__(self) -> None:
        self._vectors: dict[str, np.ndarray] = {}
        self._hashes: dict[str, list[dict[str, str]]] = {}
        self._lock = threading.RLock()
        self._faiss = None
        self._faiss_ids: list[str] = []
        self._dirty = True

    @property
    def backend(self) -> str:
        return "faiss" if FAISS_AVAILABLE else "numpy"

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._vectors)

    def listing_ids(self) -> list[str]:
        with self._lock:
            return list(self._vectors.keys())

    def add(self, listing_id: str, vectors: np.ndarray, hashes: list[dict[str, str]]) -> None:
        if vectors.size == 0:
            return
        vectors = np.asarray(vectors, dtype=np.float32)
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        vectors = vectors / np.clip(norms, 1e-12, None)
        with self._lock:
            self._vectors[listing_id] = vectors
            self._hashes[listing_id] = hashes
            self._dirty = True

    def remove(self, listing_id: str) -> bool:
        with self._lock:
            existed = self._vectors.pop(listing_id, None) is not None
            self._hashes.pop(listing_id, None)
            if existed:
                self._dirty = True
            return existed

    def clear(self) -> None:
        with self._lock:
            self._vectors.clear()
            self._hashes.clear()
            self._faiss = None
            self._faiss_ids = []
            self._dirty = True

    def _rebuild_faiss(self) -> None:
        if not FAISS_AVAILABLE:
            return
        matrix, ids = self._matrix()
        if matrix.size == 0:
            self._faiss = None
            self._faiss_ids = []
            return
        index = faiss.IndexFlatIP(matrix.shape[1])
        index.add(matrix)
        self._faiss = index
        self._faiss_ids = ids
        self._dirty = False

    def _matrix(self) -> tuple[np.ndarray, list[str]]:
        ids: list[str] = []
        blocks: list[np.ndarray] = []
        for listing_id, vectors in self._vectors.items():
            blocks.append(vectors)
            ids.extend([listing_id] * vectors.shape[0])
        if not blocks:
            return np.zeros((0, 0), dtype=np.float32), []
        return np.vstack(blocks).astype(np.float32), ids

    def search(
        self,
        vectors: np.ndarray,
        hashes: list[dict[str, str]],
        exclude_listing_id: str | None = None,
    ) -> DuplicateMatch | None:
        if vectors.size == 0:
            return None
        vectors = np.asarray(vectors, dtype=np.float32)
        with self._lock:
            if not self._vectors:
                return None

            candidate_ids: set[str] = set()
            cosine_by_listing: dict[str, float] = {}
            image_by_listing: dict[str, int] = {}

            if FAISS_AVAILABLE:
                if self._dirty or self._faiss is None:
                    self._rebuild_faiss()
                if self._faiss is not None:
                    k = min(20, self._faiss.ntotal)
                    _, indices = self._faiss.search(vectors, k)
                    for row in indices:
                        for idx in row:
                            if idx < 0:
                                continue
                            listing_id = self._faiss_ids[int(idx)]
                            if listing_id != exclude_listing_id:
                                candidate_ids.add(listing_id)

            # NumPy path gives exact per-listing maxima for the candidate set.
            matrix, ids = self._matrix()
            if matrix.size == 0:
                return None
            sims = vectors @ matrix.T  # (n_images, n_indexed)
            for image_idx in range(sims.shape[0]):
                row = sims[image_idx]
                for flat_idx, score in enumerate(row):
                    listing_id = ids[flat_idx]
                    if listing_id == exclude_listing_id:
                        continue
                    if candidate_ids and listing_id not in candidate_ids:
                        continue
                    candidate_ids.add(listing_id)
                    if score > cosine_by_listing.get(listing_id, -1.0):
                        cosine_by_listing[listing_id] = float(score)
                        image_by_listing[listing_id] = image_idx

            best: DuplicateMatch | None = None
            for listing_id in candidate_ids:
                phash_score = compare_hash_sets(hashes, self._hashes.get(listing_id, []))
                match = DuplicateMatch(
                    listing_id=listing_id,
                    cosine=max(0.0, min(1.0, cosine_by_listing.get(listing_id, 0.0))),
                    phash=max(0.0, min(1.0, phash_score)),
                    image_index=image_by_listing.get(listing_id, 0),
                )
                if best is None or match.similarity > best.similarity:
                    best = match
            return best
