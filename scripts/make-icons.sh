#!/usr/bin/env bash
# Rastert die SVG-Quellen in src/assets zu den PNG-Symbolen in public/icons (Inkscape noetig).
set -euo pipefail
cd "$(dirname "$0")/.."
r() { inkscape "$1" --export-type=png --export-filename="$3" -w "$2" -h "$2" >/dev/null 2>&1; }
r src/assets/icon.svg 192 public/icons/192.png
r src/assets/icon.svg 512 public/icons/512.png
r src/assets/icon-maskable.svg 512 public/icons/maskable-512.png
r src/assets/icon-maskable.svg 180 public/icons/apple-touch-icon.png
