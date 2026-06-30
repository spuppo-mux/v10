# Perf Test — SPF vs HLS.js

Static HTML test pages measuring five player configurations against two content types. Each page reports timing in an on-page overlay; bundle transfer size is read manually from DevTools → Network.

## The matrix

Five **player configurations**, two **content types**. Config A is the control.

| Config | Description |
| --- | --- |
| **A** | SPF only |
| **B** | Bundled SPF + hls.js (one CDN entry; router picks engine via `prefer-hlsjs`) |
| **C** | Bundled SPF + hls.light (same router, aliased lib) |
| **D** | Lazy SPF → hls.js (mocked 20 ms format-detection endpoint, then optional bundle import) |
| **E** | Lazy SPF → hls.light (same flow, lighter lazy bundle) |

| Content | A | B | C | D | E |
| --- | --- | --- | --- | --- | --- |
| **CMAF** (Premium asset) | [`cmaf/a-spf.html`](cmaf/a-spf.html) (control) | [`cmaf/b-bundled-hlsjs.html`](cmaf/b-bundled-hlsjs.html) | [`cmaf/c-bundled-hlslight.html`](cmaf/c-bundled-hlslight.html) | [`cmaf/d-lazy-hlsjs.html`](cmaf/d-lazy-hlsjs.html) | [`cmaf/e-lazy-hlslight.html`](cmaf/e-lazy-hlslight.html) |
| **TS** (Plus asset) | _n/a — SPF cannot play TS_ | [`ts/b-bundled-hlsjs/`](ts/b-bundled-hlsjs/index.html) | [`ts/c-bundled-hlslight/`](ts/c-bundled-hlslight/index.html) | [`ts/d-lazy-hlsjs/`](ts/d-lazy-hlsjs/index.html) | [`ts/e-lazy-hlslight/`](ts/e-lazy-hlslight/index.html) |

Open [`index.html`](index.html) for a clickable landing page.

### What each page does

- **A** — Loads `simple-hls-video.js`, mounts `<simple-hls-video>`, plays the CMAF source. The baseline.
- **B / C** — Loads `dual-hls-video.js` or `dual-hls-light-video.js`. Both engines bundled. On CMAF the router (no `prefer-hlsjs`) instantiates `<simple-hls-video>`; on TS (`prefer-hlsjs`) it instantiates `<hls-video>` or `<hls-light-video>`. Marks `hlsjs-loaded` after the bundle import.
- **D / E** — Loads `simple-hls-video.js`, mounts an empty `<simple-hls-video>`, fires a 20 ms `setTimeout` mock. The mock returns `"cmaf"` on CMAF pages (no lazy fetch — SPF plays the content) or `"ts"` on TS pages (lazy-imports the hls.js / hls.light bundle, then swaps in `<hls-video>` / `<hls-light-video>`). Marks `spf-init`, `endpoint-response`, and on TS `hlsjs-loaded`.

### Comparisons the matrix supports

| Delta | What it measures |
| --- | --- |
| CMAF B − A | Bundle tax of shipping hls.js even when never used |
| CMAF C − A | Bundle tax of shipping hls.light even when never used |
| CMAF D − A | Cost of the lazy-architecture detection step on the happy path |
| CMAF E − D | Should be ~0 — both skip the lazy load on CMAF |
| TS C − TS B | Library-swap delta on the bundled path |
| TS D − TS B | Lazy-vs-bundled cost on full hls.js |
| TS E − TS D | Library-swap delta on the lazy path |
| TS E − TS C | Bundled-vs-lazy cost on hls.light |

## Bundles used

| Bundle | Built by | Purpose |
| --- | --- | --- |
| `packages/html/cdn/video-minimal.js` | main config | `<video-player>` + minimal skin — shared by every page |
| `packages/html/cdn/media/simple-hls-video.js` | main config | SPF media element |
| `packages/html/cdn/media/hls-video.js` | main config | hls.js media element |
| `packages/html/cdn/media/dual-hls-video.js` | main config | Router shipping both SPF + hls.js |
| `packages/html/cdn/media/hls-light-video.js` | aliased config | hls.light media element |
| `packages/html/cdn/media/dual-hls-light-video.js` | aliased config | Router shipping both SPF + hls.light |

The aliased config rewrites `hls.js → hls.js/light` at bundle time. Aliased bundles are self-contained (no chunk sharing with the main config), so the lazy hls.light path ships some wrapper-glue code twice (~10 kB). See the writeup notes at the bottom of this README.

## `<dual-hls-video>` / `<dual-hls-light-video>` — the bundled router

Both engines ship in one CDN bundle. A thin router element reads a boolean `prefer-hlsjs` attribute at construction time and instantiates one of two inner custom elements:

- `prefer-hlsjs` absent → `<simple-hls-video>` (SPF)
- `prefer-hlsjs` present → `<hls-video>` (or `<hls-light-video>` on the `-light` variant)

The router exposes its inner element as `.media` so the timing helper can attach `'playing'` listeners to the real media element.

## Phase marks captured by `perf.js`

| Mark | When |
| --- | --- |
| `pageLoadMs` | `navigationStart` → window `load` event (Navigation Timing API) |
| `playerInitMs` | Synchronous moment after dynamic imports settle and the page renders the player tags |
| `firstFrameMs` | First `'playing'` event on the media element (or `'loadeddata'` on no-autoplay pages) |
| `spf-init` | SPF custom element registered + mounted (D / E) |
| `endpoint-response` | 20 ms mock format-detection resolves (D / E) |
| `hlsjs-loaded` | Bundle containing hls.js/hls.light is imported and define registered (B / C, and D / E on TS) |

Test plan's "Video Start Time" = `firstFrameMs − playerInitMs`.

**Bundle Transfer Size** is **not** auto-captured — Resource Timing doesn't expose the gzipped "Transferred" column. Read it from DevTools → Network → Transferred (filter on `JS`, with "Disable cache" ticked).

## Prerequisites

```bash
pnpm install
pnpm build:packages
pnpm -F @videojs/html build:cdn
```

`build:packages` produces `packages/*/dist/`. The CDN bundles in `packages/html/cdn/` are produced by `build:cdn` — these are what the perf-test pages actually load. Re-run `build:cdn` whenever you change SPF, core, or html source.

## Serving

Open the **repository root** (`v10/`) in VS Code and use Live Server on `apps/perf-test/index.html`. The pages reference assets via root-absolute paths, so the server must be rooted at the monorepo root.

Alternative:

```bash
npx serve . -l 5500
# then open http://localhost:5500/apps/perf-test/
```

## Measurement procedure (per test cell)

1. Open DevTools → Network. Set throttling (N1–N6 per the plan). **Tick "Disable cache"** for cold runs — otherwise shared chunks read 0 bytes and the comparison breaks.
2. Hard-reload the page (`Cmd+Shift+R`).
3. Wait until the overlay populates `firstFrame`.
4. Read `console.table` output for `pageLoadMs` / `playerInitMs` / `firstFrameMs` / phase marks.
5. Read total transferred JS size from the Network panel summary.
6. Repeat 3× per condition; record median in the spreadsheet. Discard outliers > 2× median.

## Tweaking the test assets

Sources live in [`_shared/sources.js`](_shared/sources.js): `CMAF_SOURCE` (Premium asset) and `TS_SOURCE` (Plus asset). Edit those constants to test alternate assets — every page picks up the change.

## Extras

Orthogonal / legacy tests live under [`extras/`](extras/):

- `extras/tc-01-no-autoplay/` — page load without playback (SPF + hls.js)
- `extras/tc-02-autoplay-cmaf/` — autoplay CMAF baseline (SPF + standalone hls.js, pre-matrix)
- `extras/tc-04-background/` — fullscreen ambient muted-loop variant
- `extras/tc-05-warm-cache/` — warm-cache reload procedure (run on the matrix pages)

## Caveats worth flagging in the writeup

- **Aliased bundles don't chunk-share with the main config.** TS · E (lazy hls.light) ships ~10 kB of wrapper glue twice — once via the SPF main-config chunks, once inlined in the self-contained hls.light bundle. Real but small. TS · D (lazy full hls.js) doesn't pay this because both halves are in the main config and share chunks naturally.
- **`<simple-hls-video>` vs `<hls-video>` is not just engines.** Both go through the same `<video-player>` + skin shell, but the SPF element is younger and ships fewer features. Any gap captured here is the engine + adapter delta, not pure engine cost.
- **DevTools throttling does not simulate packet loss or jitter** (N4, N5). Use Charles Proxy or a similar tool for those conditions.
- **First page-load primes the chunk cache.** Whichever page you visit first will pay full cost; subsequent pages get cached chunks. Use "Disable cache" or clear site data between cells when measuring cold loads.
</content>
</invoke>