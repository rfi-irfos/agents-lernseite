#!/usr/bin/env bash
# Lighthouse (mobil) gegen `vite preview` des Builds, dreimal; läuft auf der Kolonie (colony-run).
set -euo pipefail
LH_VERSION=12.8.2
PORT=$((4300 + $$ % 500)) # eigener Port
PREVIEW_PID=
trap '[ -n "$PREVIEW_PID" ] && kill "$PREVIEW_PID" 2>/dev/null || true' EXIT
npm ci >/dev/null 2>&1; npx playwright install chromium >/dev/null 2>&1; npm run build 2>&1 | tail -8
npx vite preview --host 127.0.0.1 --port "$PORT" --strictPort >/tmp/prev-$PORT.log 2>&1 &
PREVIEW_PID=$!
for i in $(seq 1 30); do curl -sf "http://127.0.0.1:$PORT/" >/dev/null && break; sleep 1; done
curl -sI "http://127.0.0.1:$PORT/" | head -1
mkdir -p test-out/lighthouse
export CHROME_PATH=$(node -e 'import("@playwright/test").then(m=>console.log(m.chromium.executablePath()))')
for RUN in 1 2 3; do
  npx --yes "lighthouse@$LH_VERSION" "http://127.0.0.1:$PORT/" --chrome-flags="--headless=new --no-sandbox" --output=json --output=html --output-path=test-out/lighthouse/run$RUN --quiet 2>&1 | tail -5
  node -e '
const r=JSON.parse(require("fs").readFileSync("test-out/lighthouse/run'$RUN'.report.json"));
console.log("run '$RUN'", r.lighthouseVersion, Object.entries(r.categories).map(([k,v])=>k+"="+v.score).join(" "), "TBT", r.audits["total-blocking-time"].displayValue, "LCP", r.audits["largest-contentful-paint"].displayValue, "CLS", r.audits["cumulative-layout-shift"].displayValue)
'
done
# Lighthouse 12 hat keine PWA-Kategorie mehr: Installierbarkeit direkt von Chrome (CDP Page.getInstallabilityErrors)
cat > installability.tmp.mjs <<'JS'
import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage()
const c = await p.context().newCDPSession(p)
await c.send('Page.enable')
await p.goto(process.argv[2])
await p.waitForTimeout(3000)
const r = await c.send('Page.getInstallabilityErrors')
const m = await c.send('Page.getAppManifest')
console.log('installability errors:', JSON.stringify(r.installabilityErrors), 'manifest errors:', JSON.stringify(m.errors))
await b.close()
JS
node installability.tmp.mjs "http://127.0.0.1:$PORT/" | tee test-out/lighthouse/installability.txt
rm installability.tmp.mjs
