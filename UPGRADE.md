# Backend Upgrade — Cloud Functions (Node 8 → 22) + Python utility

Brings the Firebase backend off years-EOL runtimes/SDKs and onto current
versions. The functions stay on the **1st-gen** programming model (lowest-risk
path) but run on the latest SDKs and Node 22.

## Verified in this repo (Linux container, no deploy)

- `npm install` (functions) — clean resolution.
- `node --check` on every function module — all parse.
- Module load test — `index.js` + all deps load; `admin.initializeApp()` /
  `admin.firestore()` succeed; all **9 triggers register** (query, google,
  sticker, createAlternatives, alternatives, overlay, featured, localities, ping).
- **End-to-end invocation** of the pure endpoints with mock req/res:
  `ping → "ping"`, `localities → [{austin…},{boston…},{sf…}]`.
- `puppeteer.KnownDevices['iPhone X']` resolves (the old `DeviceDescriptors`
  import would have thrown at load).
- Python: `py_compile` passes; `pip install --dry-run -r requirements.txt`
  resolves with no conflicts.

> Not verifiable here: an actual `firebase deploy` (needs project + auth) and
> Puppeteer rendering at runtime (needs Chromium in the function — see below).

## What changed

### `functions/package.json`
| Package | Before | After |
|---|---|---|
| node (engine) | 8 | **22** |
| firebase-functions | ^2.3.0 | **^7.2.5** |
| firebase-admin | ~7.0.0 | **^13.10.0** |
| puppeteer | ^1.17.0 | **^25.1.0** |
| cloudinary | ^1.14.0 | **^2.10.0** |
| handlebars | ^4.1.2 | **^4.7.9** |
| glob | (transitive) | **^13.0.6** (now explicit) |
| newsapi | ^2.4.0 | ^2.4.1 |
| lodash | ^4.17.11 | ^4.17.21 |
| request-ip | ^2.1.3 | **removed** (was imported but never used) |
| firebase-functions-test (dev) | ^0.1.6 | ^3.5.0 |

`serve` script now uses `firebase emulators:start` (the old `firebase serve` is
deprecated).

### Code changes for removed/changed APIs
- **`functions.config()` is gone** (shut down; removed in firebase-functions v7).
  All reads moved to `process.env` (see [`functions/.env.example`](functions/.env.example)):
  `cloudinary.key/secret → CLOUDINARY_KEY/SECRET`, `newsapi.id → NEWSAPI_ID`,
  `chromeWS → CHROME_WS`, `azure.id → AZURE_ID`. `admin.initializeApp(functions.config().firebase)`
  → **`admin.initializeApp()`** (auto-discovers config in the Functions runtime).
- **1st-gen import made explicit:** `require('firebase-functions')` →
  `require('firebase-functions/v1')` in `index.js`, so `https.onRequest`,
  `runWith`, and `firestore….onCreate` keep working under v7.
- **Puppeteer:** `require('puppeteer/DeviceDescriptors')` (removed) →
  `puppeteer.KnownDevices`.
- **glob v13:** `glob.sync(...)` (removed in glob v9+) → `globSync(...)`, scoped to
  the module's `templates/` dir so the handlebars `require()` stays stable across
  glob versions.

### Python (`Python/requirements.txt`)
Replaced the frozen 2019 transitive lockfile with direct deps:
`firebase-admin>=7.0,<8` (was 2.17.0), `Pillow>=12.0,<13` (was 6.0.0). The
script's APIs (`credentials.Certificate`, `firestore.client()`, `Image.open`)
are unchanged across these majors.

## Required before deploy / follow-ups

1. **Set runtime env / secrets.** Copy `functions/.env.example` →
   `functions/.env` and fill values. For production, move the secrets
   (`CLOUDINARY_SECRET`, `NEWSAPI_ID`) to **Cloud Secret Manager** via
   `defineSecret` + per-function `runWith({ secrets: [...] })` rather than a
   plaintext `.env`. If the old project had deployed runtime config, export it
   first: `firebase functions:config:export`.
2. **Puppeteer on Cloud Functions.** Full `puppeteer` bundles a large Chromium;
   gen-1 functions must have it available at runtime and need generous memory
   (the screenshot functions already use `{ memory: '2GB' }`). The lower-risk
   production path is the existing **external-browser** option — set `CHROME_WS`
   to a hosted Chrome's websocket endpoint (e.g. Browserless) so the function
   `puppeteer.connect()`s instead of launching Chromium. Alternatively switch to
   `puppeteer-core` + `@sparticuz/chromium`. Smoke-test `/sticker` and the
   alternatives trigger after deploy.
3. **Tooling.** Use a recent `firebase-tools` CLI (deploying `nodejs22` +
   functions v7 requires it).
4. **Optional future work:** migrate to **2nd-gen** functions
   (`firebase-functions/v2`) for better concurrency/cold-starts — a larger change
   (different request/trigger signatures), intentionally out of scope here.
