#!/usr/bin/env bash
# Baut die App, startet `vite preview` und erstellt das Kontaktblatt; läuft auf der Kolonie (colony-run -a test-out/contact).
set -euo pipefail
PORT=$((4300 + $$ % 500))
PREVIEW_PID=
trap '[ -n "$PREVIEW_PID" ] && kill "$PREVIEW_PID" 2>/dev/null || true' EXIT
npm ci >/dev/null 2>&1; npx playwright install chromium >/dev/null 2>&1; npm run build >/dev/null 2>&1
npx vite preview --host 127.0.0.1 --port "$PORT" --strictPort >/dev/null 2>&1 &
PREVIEW_PID=$!
for i in $(seq 1 30); do curl -sf "http://127.0.0.1:$PORT/" >/dev/null && break; sleep 1; done
BASE_URL="http://127.0.0.1:$PORT" npm run contact-sheet 2>&1 | tail -20
