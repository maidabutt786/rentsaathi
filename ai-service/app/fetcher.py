"""Safe image download with timeouts, size limits and decompression-bomb protection."""
from __future__ import annotations

import io
import logging
from typing import Protocol

import httpx
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

Image.MAX_IMAGE_PIXELS = 40_000_000


class ImageFetchError(Exception):
    pass


class ImageFetcher(Protocol):
    def fetch(self, url: str) -> Image.Image: ...


class HttpImageFetcher:
    def __init__(self, timeout_seconds: float = 8.0, max_bytes: int = 6 * 1024 * 1024) -> None:
        self.timeout_seconds = timeout_seconds
        self.max_bytes = max_bytes

    def fetch(self, url: str) -> Image.Image:
        try:
            with httpx.Client(timeout=self.timeout_seconds, follow_redirects=True) as client:
                with client.stream("GET", url) as response:
                    response.raise_for_status()
                    content_type = response.headers.get("content-type", "")
                    if content_type and not content_type.startswith("image/"):
                        raise ImageFetchError(f"Unsupported content type: {content_type}")
                    buffer = bytearray()
                    for chunk in response.iter_bytes():
                        buffer.extend(chunk)
                        if len(buffer) > self.max_bytes:
                            raise ImageFetchError("Image exceeds the size limit")
            image = Image.open(io.BytesIO(bytes(buffer)))
            image.load()
            return image.convert("RGB")
        except ImageFetchError:
            raise
        except (httpx.HTTPError, UnidentifiedImageError, OSError, ValueError) as exc:
            raise ImageFetchError(str(exc)) from exc
