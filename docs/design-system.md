# RentSaathi design system

Single source of truth: [`branding/tokens.json`](../branding/tokens.json). The React app maps these to
CSS variables (`web/src/styles/tokens.css`) and Tailwind theme keys (`web/tailwind.config.js`).
The Flutter app in a later part will read `tokens.json` unchanged.

## Logo usage
| Context | File | Notes |
|---|---|---|
| Navbar, footer, auth pages, admin sidebar, email templates | `rentsaathi-logo-transparent.png` | height 40–48 px, links home, alt `RentSaathi` |
| Collapsed sidebar / tight mobile | `rentsaathi-icon.png` | square, transparent |
| Favicon, PWA, apple-touch-icon | `icon-192/512.png`, `favicon.ico` | house + figure only |

Regenerate every derivative with `python3 branding/make_assets.py` (never redraw the logo).

## Colour tokens
| Token | Hex | Use |
|---|---|---|
| `primary` | `#A20224` | main buttons, links, active nav, focus rings, map markers |
| `primary-hover` | `#7D0119` | hover/pressed primary |
| `primary-soft` | `#FBE9ED` | chips, selected rows, icon wells |
| `secondary` | `#764002` | secondary buttons, heading accents, icons |
| `secondary-soft` | `#F6EDE2` | warm chips |
| `background` | `#FFFCFA` | page |
| `surface` | `#FFFFFF` | cards |
| `subtle` | `#FAF6F3` | alternating sections |
| `text` | `#2B1B14` | body/headings |
| `text-muted` | `#6B5B53` | secondary copy |
| `border` | `#EADFD8` | hairlines, inputs |
| `verified` | `#2E7D32` | trust badge (always with icon + text) |
| `suspicious` | `#B7791F` | trust badge (always with icon + text) |
| `high-risk` | `#C62828` | trust badge (always with icon + text) |
| `info` | `#1F6F8B` | informational notices |
| chart palette | `#A20224 #764002 #D9A066 #E8B4BD #8C6D5A #2E7D32` | Recharts only |

Contrast: white on `#A20224` ≈ 7.6:1 (AAA), `#2B1B14` on `#FFFCFA` ≈ 15:1, `#6B5B53` on
`#FFFFFF` ≈ 6.0:1. Status colours are never the only signal — every badge includes an icon and a label.

## Typography & shape
* Headings: Poppins (500/600/700), body: Inter (400/500/600), installed via `@fontsource` packages.
* Radius: cards `rounded-2xl`, buttons/inputs `rounded-xl`, pills `rounded-full`.
* Shadows: soft, warm-tinted (`--shadow-card`, `--shadow-lift`).
* Spacing: 4/8/16/24/32/48/64 px scale; generous whitespace; mobile-first.

## Accessibility
Focus-visible ring is 2 px `primary` with 2 px offset on every interactive element. Status never
relies on colour alone. All images need alt text; decorative icons are `aria-hidden`.
