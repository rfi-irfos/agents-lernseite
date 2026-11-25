#!/usr/bin/env bash
# Baut die App, startet `vite preview` und macht die Sichtprobe der Karte; läuft auf der Kolonie (colony-run -a test-out/karte).
set -euo pipefail
PORT=$((4300 + $$ % 500))
PREVIEW_PID=
trap '[ -n "$PREVIEW_PID" ] && kill "$PREVIEW_PID" 2>/dev/null || true' EXIT
npm ci >/dev/null 2>&1; npx playwright install chromium >/dev/null 2>&1; npm run build 2>&1 | tail -3
npx vite preview --host 127.0.0.1 --port "$PORT" --strictPort >/dev/null 2>&1 &
PREVIEW_PID=$!
for i in $(seq 1 30); do curl -sf "http://127.0.0.1:$PORT/" >/dev/null && break; sleep 1; done
npx esbuild scripts/karte-shots.ts --bundle --platform=node --format=esm --packages=external --outfile=test-out/karte-shots.mjs >/dev/null
BASE_URL="http://127.0.0.1:$PORT" node test-out/karte-shots.mjs 2>&1 | tail -20
