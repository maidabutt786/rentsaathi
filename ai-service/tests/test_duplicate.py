import numpy as np

from app.hashing import compare_hash_sets, compute_hashes, hash_similarity
from app.index import EmbeddingIndex
from tests.conftest import make_image


def unit(vector: list[float]) -> np.ndarray:
    array = np.asarray([vector], dtype=np.float32)
    return array / np.linalg.norm(array, axis=1, keepdims=True)


def test_index_finds_duplicate_and_excludes_self() -> None:
    index = EmbeddingIndex()
    index.add("listing-a", unit([1.0, 0.0, 0.0]), [])
    index.add("listing-b", unit([0.0, 1.0, 0.0]), [])

    match = index.search(unit([0.99, 0.01, 0.0]), [], exclude_listing_id="listing-new")
    assert match is not None
    assert match.listing_id == "listing-a"
    assert match.cosine > 0.99

    same = index.search(unit([1.0, 0.0, 0.0]), [], exclude_listing_id="listing-a")
    assert same is not None
    assert same.listing_id == "listing-b"


def test_index_returns_none_when_empty() -> None:
    index = EmbeddingIndex()
    assert index.search(unit([1.0, 0.0]), []) is None


def test_index_remove() -> None:
    index = EmbeddingIndex()
    index.add("listing-a", unit([1.0, 0.0]), [])
    assert index.size == 1
    assert index.remove("listing-a") is True
    assert index.remove("listing-a") is False
    assert index.size == 0


def test_phash_detects_recompressed_copy() -> None:
    image = make_image((200, 60, 30), pattern=1)
    same = make_image((200, 60, 30), pattern=1)
    different = make_image((10, 200, 90), pattern=0)
    assert hash_similarity(compute_hashes(image)["phash"], compute_hashes(same)["phash"]) == 1.0
    assert compare_hash_sets([compute_hashes(image)], [compute_hashes(same)]) == 1.0
    assert compare_hash_sets([compute_hashes(image)], [compute_hashes(different)]) < 0.95


def test_phash_signal_finds_duplicate_even_with_weak_cosine() -> None:
    index = EmbeddingIndex()
    image = make_image((120, 40, 200), pattern=1)
    index.add("listing-photo", unit([1.0, 0.0, 0.0]), [compute_hashes(image)])

    match = index.search(unit([0.0, 1.0, 0.0]), [compute_hashes(image)], exclude_listing_id="other")
    assert match is not None
    assert match.listing_id == "listing-photo"
    assert match.phash == 1.0
    assert match.similarity == 1.0
