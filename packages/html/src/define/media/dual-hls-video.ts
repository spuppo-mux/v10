// Side-import the two engine-element defines so both `<simple-hls-video>` and
// `<hls-video>` are registered when the dual bundle loads.
import '../../define/media/hls-video';
import '../../define/media/simple-hls-video';
import { DualHlsVideo } from '../../media/dual-hls-video';
import { safeDefine } from '../safe-define';

export class DualHlsVideoElement extends DualHlsVideo {
  static readonly tagName = 'dual-hls-video';
  static readonly hlsjsTag = 'hls-video';
}

safeDefine(DualHlsVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [DualHlsVideoElement.tagName]: DualHlsVideoElement;
  }
}
