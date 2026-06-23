import { HlsVideo } from '../../media/hls-video';
import { safeDefine } from '../safe-define';

// Same class as <hls-video> — the only difference between this element and
// `<hls-video>` is the bundled hls.js variant. The CDN config aliases
// `hls.js` → `hls.js/light` for this entry, producing an `<hls-light-video>`
// custom element backed by hls.light. Source is single-sourced through HlsVideo;
// only the bundled lib differs.
export class HlsLightVideoElement extends HlsVideo {
  static readonly tagName = 'hls-light-video';
}

safeDefine(HlsLightVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [HlsLightVideoElement.tagName]: HlsLightVideoElement;
  }
}
