# Perf Test — SPF vs HLS.js

Static HTML test pages backing the **Video.js Performance Test Plan — SPF vs HLS.js Baseline Comparison**. Each page loads `@videojs/html` and a media-element bundle (`<simple-hls-video>` for SPF, `<hls-video>` for HLS.js), then reports timing in an on-page overlay.

## What's here

| Test case | Config A (SPF) | Config B (HLS.js) | Other configs |
| --- | --- | --- | --- |
| TC-01 — Page load, no autoplay | [`tc-01-no-autoplay/spf.html`](tc-01-no-autoplay/spf.html) | [`tc-01-no-autoplay/hlsjs.html`](tc-01-no-autoplay/hlsjs.html) | — |
| TC-02 — Autoplay, CMAF | [`tc-02-autoplay-cmaf/spf.html`](tc-02-autoplay-cmaf/spf.html) | [`tc-02-autoplay-cmaf/hlsjs.html`](tc-02-autoplay-cmaf/hlsjs.html) | — |
| TC-03 — Bundled SPF + HLS.js (TS) | _n/a — SPF cannot play TS_ | [`tc-03-autoplay-ts/hlsjs.html`](tc-03-autoplay-ts/hlsjs.html) | — |
| TC-04 — Background / ambient | [`tc-04-background/spf.html`](tc-04-background/spf.html) | [`tc-04-background/hlsjs.html`](tc-04-background/hlsjs.html) | — |
| TC-05 — Warm cache | reuses TC-02 pages | reuses TC-02 pages | see [`tc-05-warm-cache/README.md`](tc-05-warm-cache/README.md) |
| TC-06 — Bundled SPF + hls.light (TS) | — | — | Config C: [`tc-06-bundled-light-ts/bundled-light.html`](tc-06-bundled-light-ts/bundled-light.html) |
| TC-07 — Sequenced lazy: SPF → HLS.js (TS) | — | — | Config D: [`tc-07-sequenced-hlsjs/sequenced.html`](tc-07-sequenced-hlsjs/sequenced.html) |
| TC-08 — Sequenced lazy: SPF → hls.light (TS) | — | — | Config E: [`tc-08-sequenced-hlslight/sequenced.html`](tc-08-sequenced-hlslight/sequenced.html) |

Open [`index.html`](index.html) for a clickable landing page.

### The bundled-vs-lazy comparison (TC-03/06 vs TC-07/08)

The five-case matrix the perf plan answers:

| Case | Page | Bundle | Engine pick |
| --- | --- | --- | --- |
| 1. Happy path | TC-02 SPF | SPF only | n/a — CMAF |
| 2. Bundled, HLS.js, TS | TC-03 | SPF + HLS.js together | `prefer-hlsjs` attribute, set at construction |
| 3. Bundled, hls.light, TS | TC-06 | SPF + hls.light together | `prefer-hlsjs` attribute, set at construction |
| 4. Lazy, HLS.js, TS | TC-07 | SPF first, HLS.js fetched after 20 ms mock | Element swap |
| 5. Lazy, hls.light, TS | TC-08 | SPF first, hls.light fetched after 20 ms mock | Element swap |

Delta to read off the spreadsheet:

- **TC-07 − TC-03** = the lazy-vs-bundled cost on full HLS.js (endpoint mock + lazy fetch + element swap)
- **TC-08 − TC-06** = same delta on hls.light
- **TC-06 − TC-03** = bundled HLS.js vs bundled hls.light (architectural-symmetric library swap)
- **TC-08 − TC-07** = same swap on the lazy path

### `<dual-hls-video>` / `<dual-hls-light-video>` — the bundled router (TC-03, TC-06)

Both engines ship in one CDN bundle. A thin router element reads a boolean `prefer-hlsjs` attribute at construction time and renders one of two inner custom elements:

- `prefer-hlsjs` absent → `<simple-hls-video>` (SPF)
- `prefer-hlsjs` present → `<hls-video>` (or `<hls-light-video>` on the `-light` variant)

The router exposes its inner element as `.media` so the timing helper can attach `'playing'` listeners to the real media element. No runtime engine switching, no fallback logic, no failure detection — these tests always play TS, so the bundled cases always set `prefer-hlsjs`. The SPF bytes ship but never instantiate; that overhead is exactly what cases 2/3 measure against cases 4/5.

The light variant is a separate aliased bundle built by the same `aliasedEntries` machinery as `<hls-light-video>` — `hls.js` is rewritten to `hls.js/light` for the whole bundle including the inner `<hls-light-video>` element.

### TC-07 / TC-08: sequenced lazy load via element swap

Both pages mount `<simple-hls-video>` first (so the media element is in the DOM before any lazy work), then:

1. `performance.mark('spf-init')` — SPF custom element registered + mounted.
2. `await new Promise(r => setTimeout(r, 20))` — mocked format-detection endpoint.
3. `performance.mark('endpoint-response')` — mock returns "TS".
4. `await import('/packages/html/cdn/media/hls-{video,light-video}.js')` — lazy bundle fetch.
5. `performance.mark('hlsjs-loaded')` — define registered.
6. Swap: `<simple-hls-video>` → `<hls-video>` or `<hls-light-video>` with the TS source.
7. `performance.mark('first-frame')` (via `attachMediaTiming`) — first `'playing'` event.

All four marks appear in the on-page overlay AND DevTools → Performance panel (filter by name). They're also serialized into the Copy-CSV output. Phase columns stay blank for TC-01–06 since `markPhase()` isn't called there.

## Prerequisites

The pages reference `/packages/html/cdn/...` and `/packages/skins/dist/...` directly, so the workspace packages must be built first:

```bash
pnpm install
pnpm build:packages
pnpm -F @videojs/html build:cdn
```

`build:packages` produces `packages/*/dist/`. The CDN bundles in `packages/html/cdn/` are produced by a separate script (`build:cdn`) — these are what the perf-test pages actually load. Re-run `build:cdn` whenever you change SPF, core, or html source.

After both builds, the bundles exist at `packages/html/cdn/*.js`, `packages/html/cdn/media/*.js`, and `packages/skins/dist/default/...`. No further build step is needed when you change the test pages themselves — they're plain HTML.

## Serving

Open the **repository root** (`v10/`) in VS Code and use Live Server on `apps/perf-test/index.html`. The pages reference assets via root-absolute paths (`/packages/...`, `/apps/perf-test/_shared/...`), so the server must be rooted at the monorepo root.

If you prefer a different static server, run it from the repo root, e.g.:

```bash
npx serve . -l 5500
# then open http://localhost:5500/apps/perf-test/
```

## What the pages report

A top-left overlay shows three numbers, also written to `window.__PERF__` and `console.table`:

| Field | Definition |
| --- | --- |
| `pageLoadMs` | `navigationStart` → `load` event (Navigation Timing API) |
| `playerInitMs` | `navigationStart` → moment the page rendered the player tags after dynamic imports settled |
| `firstFrameMs` | `navigationStart` → first `'playing'` event (or `'loadeddata'` on no-autoplay pages) |

The test plan's **Video Start Time** = `firstFrameMs − playerInitMs`.

**Bundle Transfer Size is not auto-captured** — Resource Timing doesn't expose the gzipped "Transferred" column. Read it from DevTools → Network → Transferred (filter on `JS`).

## Measurement procedure (per test cell)

1. Open DevTools → Network. Set throttling (N1–N6 per the plan). Tick "Disable cache" for cold runs.
2. Hard-reload the page (`Cmd+Shift+R`).
3. Wait until the overlay populates `firstFrame` (or until 60 s elapses for no-autoplay pages — the overlay never closes that out without playback).
4. Read `console.table` output for `pageLoadMs` / `playerInitMs` / `firstFrameMs`.
5. Read total transferred JS size from the Network panel summary.
6. Repeat 3× per condition; record median in the spreadsheet. Discard outliers > 2× median.

For TC-04, leave the page open for ~10 s to verify the loop continues without rebuffering, then close.

For TC-05, follow [`tc-05-warm-cache/README.md`](tc-05-warm-cache/README.md).

## Tweaking the test assets

CMAF and TS URLs live in [`_shared/sources.js`](_shared/sources.js). They're pulled verbatim from `apps/sandbox/app/shared/sources.ts` so the perf comparison uses the same Mux streams as the rest of the repo. Replace those constants to test alternate assets — every page picks up the change.

## Caveats worth flagging in the writeup

- **`<simple-hls-video>` vs `<hls-video>` is not just engines.** Both go through the same `<video-player>` + skin shell, but the SPF element is younger and ships fewer features. Any gap captured here is the engine + adapter delta, not pure engine cost.
- **Skin and player wrapper are shared.** Both configs load `video-minimal.js` (the same skin/player code-split bundle) and the same `video.css`. The only differing bytes are the media-element chunk — that's the apples-to-apples surface this test isolates.
- **DevTools throttling does not simulate packet loss or jitter** (N4, N5). Use Charles Proxy or a similar tool for those conditions, as called out in the test plan.
