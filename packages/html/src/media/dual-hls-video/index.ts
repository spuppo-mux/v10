// Router element that ships SPF + an HLS.js variant together in one bundle.
// At construction time it inspects the `prefer-hlsjs` boolean attribute and
// instantiates the corresponding inner custom element:
//   - absent  → <simple-hls-video> (SPF)
//   - present → static `hlsjsTag` defined by the subclass (e.g. <hls-video>,
//               <hls-light-video>)
//
// Used by the perf-test suite to model "we ship both engines and pick at
// runtime via a flag" without lazy loading. Sized for tests only — no runtime
// engine switching, no fallback logic.

const FORWARDED_ATTRS = ['src', 'autoplay', 'muted', 'loop', 'preload', 'playsinline', 'crossorigin'] as const;

export class DualHlsVideo extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return FORWARDED_ATTRS;
  }

  /** Tag name for the HLS.js-backed inner element. Subclasses override. */
  static readonly hlsjsTag: string = 'hls-video';

  #inner: HTMLElement | null = null;

  /** The actual media element doing playback — `<simple-hls-video>` or the picked HLS.js variant. */
  get media(): HTMLElement | null {
    return this.#inner;
  }

  connectedCallback(): void {
    if (this.#inner) return;
    const ctor = this.constructor as typeof DualHlsVideo;
    const tag = this.hasAttribute('prefer-hlsjs') ? ctor.hlsjsTag : 'simple-hls-video';
    const inner = document.createElement(tag);
    for (const attr of Array.from(this.attributes)) {
      if (attr.name === 'prefer-hlsjs') continue;
      inner.setAttribute(attr.name, attr.value);
    }
    this.#inner = inner;
    this.appendChild(inner);
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (!this.#inner) return;
    if (value === null) this.#inner.removeAttribute(name);
    else this.#inner.setAttribute(name, value);
  }
}
