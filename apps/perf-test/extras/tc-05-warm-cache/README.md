# Warm Cache — repeat-load procedure

This is a measurement procedure that runs against the matrix pages, not a separate test.

## Procedure

For each config and each network condition (N2, N4 are the interesting ones):

1. **Cold load.** Tick DevTools → Network → "Disable cache", or clear site data (Application → Storage → Clear site data). Hard-reload the matrix page. Record metrics.
2. **Warm load × 3.** Untick "Disable cache". Reload the same page 3 times. Record metrics each reload.
3. Compare the warm median against the cold load.

## Suggested cells to run

- **CMAF · A** ([`../../cmaf/a-spf.html`](../../cmaf/a-spf.html)) — SPF-only baseline
- **CMAF · B** ([`../../cmaf/b-bundled-hlsjs.html`](../../cmaf/b-bundled-hlsjs.html)) — bundled hls.js
- **TS · B** ([`../../ts/b-bundled-hlsjs/index.html`](../../ts/b-bundled-hlsjs/index.html)) — bundled hls.js on TS
- **TS · D** ([`../../ts/d-lazy-hlsjs/index.html`](../../ts/d-lazy-hlsjs/index.html)) — lazy hls.js on TS

## Expected signal

The bundle-size gap between configs should collapse on warm loads (everything hits the disk cache). This informs how much of the cold-load gap is felt by repeat visitors vs first-time visitors.
