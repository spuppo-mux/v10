// Perf instrumentation shared by every test page.
//
// Captures three numbers per page load:
//   - pageLoadMs    — navigationStart → load event
//   - playerInitMs  — navigationStart → first call to markPlayerReady()
//   - firstFrameMs  — navigationStart → video 'playing' (or 'loadeddata' if no autoplay)
//
// Each page load is appended to a per-pathname localStorage list, and the
// overlay shows the latest value plus median + mean across all stored runs.
// This survives normal reloads (3-run cells aggregate automatically) and is
// wiped when "Clear site data" runs — which matches the cold/warm separation
// the test plan asks for. Use the Reset button when changing network
// conditions without clearing site data.
//
// Bundle transfer size is read manually from the DevTools Network tab — not
// instrumented here, because Resource Timing doesn't expose the gzipped
// "Transferred" size the test plan asks for.

const startedAt = performance.now();
const RUN_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const STORAGE_KEY = `__perf__:${location.pathname}`;

const data = {
  pageLoadMs: null,
  playerInitMs: null,
  firstFrameMs: null,
  ttfbMs: null,
  // Sequenced-load phase timings (TC-07 / TC-08). Each value is ms from
  // navigationStart. Stays null on pages that don't call markPhase().
  spfInitMs: null,
  endpointMs: null,
  hlsjsLoadedMs: null,
};

// Phases tracked on the overlay (TC-07/TC-08). Ordered for display.
const PHASE_KEYS = ['spfInitMs', 'endpointMs', 'hlsjsLoadedMs'];
const PHASE_LABELS = {
  spfInitMs: 'spf init',
  endpointMs: 'endpoint',
  hlsjsLoadedMs: 'hls.js loaded',
};

let overlayEl = null;

// --- aggregation ------------------------------------------------------------

function loadRuns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRun() {
  const runs = loadRuns();
  const row = { id: RUN_ID, t: Date.now(), ...data };
  const idx = runs.findIndex((r) => r.id === RUN_ID);
  if (idx >= 0) runs[idx] = row;
  else runs.push(row);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // Storage quota / disabled — fall through; the page still works without it.
  }
  return runs;
}

function median(nums) {
  const arr = nums.filter((n) => n != null).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = arr.length >> 1;
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function mean(nums) {
  const arr = nums.filter((n) => n != null);
  if (!arr.length) return null;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}

function aggregate(runs) {
  const cols = ['pageLoadMs', 'playerInitMs', 'firstFrameMs', ...PHASE_KEYS];
  const out = {};
  for (const c of cols) {
    const vals = runs.map((r) => r[c]);
    out[c] = { median: median(vals), mean: mean(vals), count: vals.filter((v) => v != null).length };
  }
  return out;
}

// --- overlay ---------------------------------------------------------------

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.id = '__perf_overlay__';
  Object.assign(overlayEl.style, {
    position: 'fixed',
    top: '12px',
    left: '12px',
    zIndex: '2147483647',
    minWidth: '320px',
    padding: '10px 12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#fff',
    background: 'rgba(0, 0, 0, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '6px',
    backdropFilter: 'blur(6px)',
    webkitBackdropFilter: 'blur(6px)',
  });
  document.body.appendChild(overlayEl);
  overlayEl.addEventListener('click', (e) => {
    const action = e.target?.dataset?.action;
    if (action === 'reset') resetRuns();
    else if (action === 'copy') copyCsv();
  });
  return overlayEl;
}

function fmt(v) {
  return v == null ? '—' : `${Math.round(v)} ms`;
}

function cell(v) {
  return `<td style="padding:0 0 0 12px;text-align:right;font-variant-numeric:tabular-nums;">${fmt(v)}</td>`;
}

function renderRow(label, latest, agg) {
  return (
    `<tr>` + `<td style="opacity:0.65;">${label}</td>` + cell(latest) + cell(agg.median) + cell(agg.mean) + `</tr>`
  );
}

function btn(label, action, color) {
  return (
    `<button type="button" data-action="${action}" style="` +
    `flex:1;padding:5px 8px;font:inherit;font-size:11px;font-weight:600;color:inherit;` +
    `background:${color};border:1px solid ${color.replace('0.10', '0.32')};border-radius:4px;cursor:pointer;">` +
    `${label}</button>`
  );
}

function render() {
  const el = ensureOverlay();
  const runs = loadRuns();
  const agg = aggregate(runs);
  // The current page's row is already saved in `runs`, so n reflects this
  // load too — runs.length is "this run + prior runs".
  const n = runs.length;

  // Phase rows only render once a phase has been marked at least once across
  // the whole storage history — keeps non-sequenced pages (TC-01..06) clean.
  const phaseRows = PHASE_KEYS.filter((k) => data[k] != null || agg[k].count > 0)
    .map((k) => renderRow(PHASE_LABELS[k], data[k], agg[k]))
    .join('');

  el.innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">` +
    `<span style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.55;">perf · ${location.pathname.split('/').slice(-2).join('/')}</span>` +
    `<span style="font-size:10px;opacity:0.65;">n=${n}</span>` +
    `</div>` +
    `<table style="border-collapse:collapse;width:100%;">` +
    `<thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.45;">` +
    `<th style="text-align:left;font-weight:500;">metric</th>` +
    `<th style="padding-left:12px;text-align:right;font-weight:500;">latest</th>` +
    `<th style="padding-left:12px;text-align:right;font-weight:500;">median</th>` +
    `<th style="padding-left:12px;text-align:right;font-weight:500;">mean</th>` +
    `</tr></thead><tbody>` +
    renderRow('page load', data.pageLoadMs, agg.pageLoadMs) +
    renderRow('player init', data.playerInitMs, agg.playerInitMs) +
    renderRow('first frame', data.firstFrameMs, agg.firstFrameMs) +
    phaseRows +
    `</tbody></table>` +
    `<div style="opacity:0.5;margin-top:6px;font-size:10px;">ttfb: ${fmt(data.ttfbMs)}</div>` +
    `<div style="display:flex;gap:6px;margin-top:8px;">` +
    btn('Reset', 'reset', 'rgba(255, 99, 99, 0.10)') +
    btn('Copy CSV', 'copy', 'rgba(126, 231, 135, 0.10)') +
    `</div>`;
}

function commit() {
  saveRun();
  window.__PERF__ = { ...data, runId: RUN_ID };
  window.__PERF_RUNS__ = loadRuns();
  render();
  // Console output is what gets copy/pasted into the results spreadsheet.
  console.table(window.__PERF__);
}

// --- actions ---------------------------------------------------------------

function resetRuns() {
  localStorage.removeItem(STORAGE_KEY);
  window.__PERF_RUNS__ = [];
  // Re-save *this* run so the count starts at 1 again, not 0 — clicking
  // Reset shouldn't erase the run that's currently on-screen.
  saveRun();
  render();
}

function copyCsv() {
  const runs = loadRuns();
  const header = ['runId', 'timestamp', 'pageLoadMs', 'playerInitMs', 'firstFrameMs', 'ttfbMs', ...PHASE_KEYS].join(
    ','
  );
  const rows = runs.map((r) =>
    [
      r.id,
      new Date(r.t).toISOString(),
      r.pageLoadMs,
      r.playerInitMs,
      r.firstFrameMs,
      r.ttfbMs,
      ...PHASE_KEYS.map((k) => r[k]),
    ]
      .map((v) => (v == null ? '' : v))
      .join(',')
  );
  const csv = [header, ...rows].join('\n');
  navigator.clipboard?.writeText(csv).then(
    () => flashOverlayMessage('CSV copied'),
    () => flashOverlayMessage('Copy failed')
  );
}

function flashOverlayMessage(text) {
  const el = ensureOverlay();
  const original = el.innerHTML;
  el.innerHTML = `<div style="padding:6px 0;text-align:center;opacity:0.9;">${text}</div>`;
  setTimeout(() => {
    el.innerHTML = original;
    render();
  }, 900);
}

// --- public API -------------------------------------------------------------

export function markPlayerReady() {
  if (data.playerInitMs != null) return;
  data.playerInitMs = performance.now() - startedAt;
  commit();
}

/**
 * Record a sequenced-load phase (TC-07 / TC-08). Each named phase fires
 * `performance.mark(name)` (so it shows up in the DevTools Performance
 * panel) and stores ms-since-navStart in the overlay + localStorage row.
 *
 * Supported names: 'spf-init' | 'endpoint-response' | 'hlsjs-loaded'.
 * Unknown names are still recorded via `performance.mark()` so they show
 * up in DevTools, but don't appear in the overlay.
 */
const PHASE_NAME_TO_KEY = {
  'spf-init': 'spfInitMs',
  'endpoint-response': 'endpointMs',
  'hlsjs-loaded': 'hlsjsLoadedMs',
};

export function markPhase(name) {
  performance.mark(name);
  const key = PHASE_NAME_TO_KEY[name];
  if (!key || data[key] != null) return;
  data[key] = performance.now() - startedAt;
  commit();
}

/**
 * Attach to the media element so the next 'playing' event (or 'loadeddata' if
 * the page is no-autoplay) closes out the first-frame measurement.
 */
export function attachMediaTiming(video, { autoplay }) {
  const captureEvent = autoplay ? 'playing' : 'loadeddata';
  const once = () => {
    if (data.firstFrameMs != null) return;
    data.firstFrameMs = performance.now() - startedAt;
    commit();
    video.removeEventListener(captureEvent, once);
  };
  video.addEventListener(captureEvent, once);
}

// --- automatic page-load + ttfb capture -------------------------------------

function captureNavTiming() {
  const nav = performance.getEntriesByType('navigation')[0];
  if (!nav) return;
  data.pageLoadMs = nav.loadEventEnd;
  data.ttfbMs = nav.responseStart;
  commit();
}

if (document.readyState === 'complete') {
  // Navigation entry isn't populated until after the load event fires.
  setTimeout(captureNavTiming, 0);
} else {
  window.addEventListener('load', () => setTimeout(captureNavTiming, 0));
}

// Render once on load so the overlay is visible even before any metric fires.
saveRun();
render();
