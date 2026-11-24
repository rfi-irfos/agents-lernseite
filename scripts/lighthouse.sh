set -e
npm ci >/dev/null 2>&1; npx playwright install chromium >/dev/null 2>&1; npm run build 2>&1 | tail -8
(npx vite preview --host 127.0.0.1 --port 4174 --strictPort >/tmp/prev.log 2>&1 &)
for i in $(seq 1 30); do curl -sf http://127.0.0.1:4174/ >/dev/null && break; sleep 1; done
curl -sI http://127.0.0.1:4174/ | head -1
mkdir -p test-out/lighthouse
export CHROME_PATH=$(node -e 'import("@playwright/test").then(m=>console.log(m.chromium.executablePath()))')
npx --yes lighthouse@12 http://127.0.0.1:4174/ --chrome-flags="--headless=new --no-sandbox" --output=json --output=html --output-path=test-out/lighthouse/report --quiet 2>&1 | tail -5
node -e '
const r=JSON.parse(require("fs").readFileSync("test-out/lighthouse/report.report.json"));
console.log(r.lighthouseVersion);
for(const [k,v] of Object.entries(r.categories))console.log(k,v.score);
for(const id of ["installable-manifest","service-worker","splash-screen","themed-omnibox","viewport","maskable-icon"]){const a=r.audits[id];console.log(id,a?a.score:"n/a")}
for(const [id,a] of Object.entries(r.audits)) if(a.score!==null&&a.score<1&&a.scoreDisplayMode!=="informative"&&a.scoreDisplayMode!=="notApplicable") console.log("FAIL",id,a.score,a.displayValue||"")
for(const k of ["first-contentful-paint","largest-contentful-paint","total-blocking-time","cumulative-layout-shift","speed-index"])console.log(k,r.audits[k].displayValue)
'
