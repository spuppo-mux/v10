import { SimpleSpfBackgroundVideo } from '../../media/simple-spf-background-video';
import { safeDefine } from '../safe-define';

export class SimpleSpfBackgroundVideoElement extends SimpleSpfBackgroundVideo {
  static readonly tagName = 'simple-spf-background-video';
}

safeDefine(SimpleSpfBackgroundVideoElement);

declare global {
  interface HTMLElementTagNameMap {
    [SimpleSpfBackgroundVideoElement.tagName]: SimpleSpfBackgroundVideoElement;
  }
}
