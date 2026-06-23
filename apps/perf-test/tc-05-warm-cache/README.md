# TC-05 · Repeat Loads / Warm Cache

This test case reuses the **TC-02** pages — it's a measurement procedure, not a different page.

## Procedure

For each config (A and B), and for each network condition (N2, N4):

1. **Cold load.** Clear browser cache (DevTools → Network → "Disable cache" OFF, then Application → Storage → "Clear site data"). Hard-reload the TC-02 page. Record metrics.
2. **Warm load × 3.** Keep cache enabled. Reload the TC-02 page 3 times. Record metrics each reload.
3. Compare the warm median against the cold load.

## Pages to use

- Config A — SPF: [`../tc-02-autoplay-cmaf/spf.html`](../tc-02-autoplay-cmaf/spf.html)
- Config B — HLS.js: [`../tc-02-autoplay-cmaf/hlsjs.html`](../tc-02-autoplay-cmaf/hlsjs.html)

## Expected signal

The bundle-size gap between Config A and Config B should collapse on warm loads (both configs hit the disk cache). This informs how much of the gap is felt by repeat visitors vs first-time visitors.
