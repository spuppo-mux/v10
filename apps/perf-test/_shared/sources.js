// Test assets — pulled verbatim from apps/sandbox/app/shared/sources.ts so the
// perf comparison uses the same Mux-hosted streams as the rest of the repo.
//
// CMAF (fMP4-segmented HLS) — playable by both SPF and HLS.js.
// TS  (MPEG-TS-segmented HLS) — playable only by HLS.js (SPF MSE pipeline
//   appends fMP4 segments directly and does not transmux TS).

export const CMAF_SOURCE = {
  url: 'https://stream.mux.com/QEN5L100graTl2lou400qjBgcUTyZa7H8016ftmDNPpOKg.m3u8',
  label: 'HLS / fMP4 — Premium - Product.mp4 (CMAF)',
};

export const TS_SOURCE = {
  url: 'https://stream.mux.com/N4cSOWgLf01h600mNqOQwiDlmNHt5icPTW28pa6SisPWY.m3u8',
  label: 'HLS / fMP4 — Plus - Product.mp4 (TS)',
};
