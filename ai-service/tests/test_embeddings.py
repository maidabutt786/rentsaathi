import numpy as np
from PIL import Image

from app.embeddings import ImageEmbedder


def test_embedding_is_normalised_and_deterministic() -> None:
    embedder = ImageEmbedder("resnet18", pretrained=False)
    image = Image.new("RGB", (128, 128), (180, 40, 40))
    first = embedder.embed(image)
    second = embedder.embed(image)

    assert first.shape == (512,)
    assert np.isclose(np.linalg.norm(first), 1.0, atol=1e-4)
    assert np.allclose(first, second, atol=1e-6)


def test_different_images_get_different_embeddings() -> None:
    embedder = ImageEmbedder("resnet18", pretrained=False)
    red = embedder.embed(Image.new("RGB", (128, 128), (200, 20, 20)))
    blue = embedder.embed(Image.new("RGB", (128, 128), (20, 20, 200)))
    cosine = float(np.dot(red, blue))
    assert cosine < 0.999


def test_batch_matches_single_embedding() -> None:
    embedder = ImageEmbedder("resnet18", pretrained=False)
    images = [Image.new("RGB", (96, 96), colour) for colour in [(10, 10, 10), (220, 220, 220)]]
    batch = embedder.embed_batch(images)
    assert batch.shape == (2, 512)
    assert np.allclose(batch[0], embedder.embed(images[0]), atol=1e-5)
