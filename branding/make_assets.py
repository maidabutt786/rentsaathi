#!/usr/bin/env python3
"""Generate RentSaathi brand assets from branding/rentsaathi-logo.png.

Outputs:
  branding/rentsaathi-logo-transparent.png  full wordmark, transparent background
  branding/rentsaathi-icon.png              house + figure only, square, transparent
  web/public/rentsaathi-logo.png            original (navbar/footer)
  web/public/rentsaathi-logo-transparent.png
  web/public/icon-192.png / icon-512.png
  web/public/favicon-32.png / favicon.ico / apple-touch-icon.png
  web/src/assets/*                          same files for bundling

Run:  python3 branding/make_assets.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "branding" / "rentsaathi-logo.png"
PUBLIC = ROOT / "web" / "public"
ASSETS = ROOT / "web" / "src" / "assets"
BRANDING = ROOT / "branding"

# The wordmark starts around 36% of the source width; the icon lives to its left.
ICON_REGION = (0.0, 0.36)


def white_to_alpha(image: Image.Image) -> Image.Image:
    """Turn a white background into transparency, keeping soft anti-aliased edges."""
    rgba = image.convert("RGBA")
    pixels = list(rgba.getdata())
    out = []
    for r, g, b, _ in pixels:
        # A pixel's opacity is driven by how far it is from pure white.
        alpha = 255 - min(r, g, b)
        if alpha == 0:
            out.append((255, 255, 255, 0))
            continue
        # Un-premultiply so semi-transparent edge pixels keep the ink colour
        # instead of a white halo.
        scale = 255 / alpha
        nr = max(0, min(255, round((r - (255 - alpha)) * scale)))
        ng = max(0, min(255, round((g - (255 - alpha)) * scale)))
        nb = max(0, min(255, round((b - (255 - alpha)) * scale)))
        out.append((nr, ng, nb, alpha))
    rgba.putdata(out)
    return rgba


def trim_alpha(image: Image.Image, padding_ratio: float = 0.04) -> Image.Image:
    """Crop transparent margins and add a little breathing room."""
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return image
    cropped = image.crop(bbox)
    pad = round(max(cropped.size) * padding_ratio)
    canvas = Image.new("RGBA", (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(cropped, (pad, pad), cropped)
    return canvas


def square(image: Image.Image, size: int, background: tuple[int, int, int, int] | None = None) -> Image.Image:
    """Fit an image into a square canvas, centred, preserving aspect ratio."""
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    copy = image.copy()
    copy.thumbnail((size, size), Image.LANCZOS)
    canvas.paste(copy, ((size - copy.width) // 2, (size - copy.height) // 2), copy)
    return canvas


def main() -> None:
    for directory in (PUBLIC, ASSETS, BRANDING):
        directory.mkdir(parents=True, exist_ok=True)

    original = Image.open(SRC).convert("RGB")
    width, height = original.size

    # Full transparent wordmark.
    transparent = trim_alpha(white_to_alpha(original))

    # Icon-only crop: left slice, then trim to the actual artwork.
    icon_slice = original.crop((int(width * ICON_REGION[0]), 0, int(width * ICON_REGION[1]), height))
    icon = trim_alpha(white_to_alpha(icon_slice))

    # Original + transparent full logos.
    original.save(PUBLIC / "rentsaathi-logo.png", optimize=True)
    original.save(ASSETS / "rentsaathi-logo.png", optimize=True)
    transparent.save(PUBLIC / "rentsaathi-logo-transparent.png", optimize=True)
    transparent.save(ASSETS / "rentsaathi-logo-transparent.png", optimize=True)
    transparent.save(BRANDING / "rentsaathi-logo-transparent.png", optimize=True)

    # Icon-only outputs.
    icon_512 = square(icon, 512)
    icon_512.save(PUBLIC / "icon-512.png", optimize=True)
    icon_512.save(ASSETS / "rentsaathi-icon.png", optimize=True)
    icon_512.save(BRANDING / "rentsaathi-icon.png", optimize=True)
    square(icon, 192).save(PUBLIC / "icon-192.png", optimize=True)
    square(icon, 180).save(PUBLIC / "apple-touch-icon.png", optimize=True)
    square(icon, 32).save(PUBLIC / "favicon-32.png", optimize=True)

    favicon = square(icon, 64)
    favicon.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

    print("Brand assets written to branding/, web/public/ and web/src/assets/")


if __name__ == "__main__":
    main()
