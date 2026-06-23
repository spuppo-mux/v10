// Test assets — pulled verbatim from apps/sandbox/app/shared/sources.ts so the
// perf comparison uses the same Mux-hosted streams as the rest of the repo.
//
// CMAF (fMP4-segmented HLS) — playable by both SPF and HLS.js.
// TS  (MPEG-TS-segmented HLS) — playable only by HLS.js (SPF MSE pipeline
//   appends fMP4 segments directly and does not transmux TS).

export const CMAF_SOURCE = {
  // sandbox 'hls-3' — Dancing Dude
  url: 'https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8',
  label: 'HLS / fMP4 — Dancing Dude',
};

export const TS_SOURCE = {
  // sandbox 'hls-1' — Big Buck Bunny (TS)
  url: 'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
  label: 'HLS / TS — Big Buck Bunny',
};
