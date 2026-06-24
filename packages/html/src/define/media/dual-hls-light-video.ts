// Same router as <dual-hls-video> but pairs SPF with hls.light. Bundled as a
// separate aliased CDN entry — `hls.js` is rewritten to `hls.js/light` at
// bundle time, so the inner `<hls-light-video>` defined here uses the trimmed
// hls.light build.
import '../../define/media/hls-light-video';
import '../../define/media/simple-hls-video';
import { DualHlsVideo } from '../../media/dual-hls-video';
import { safeDefine } from '../safe-define';

export class DualHlsLightVideoElement extends DualHlsVideo {
  static readonly tagName = 'dual-hls-light-video';
  static readonly hlsjsTag = 'hls-light-video';
}

safeDefine(DualHlsLightVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [DualHlsLightVideoElement.tagName]: DualHlsLightVideoElement;
  }
}
