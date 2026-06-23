import { BackgroundLoopingVideoMediaMixin } from '@videojs/spf/background-looping-video';
import { HTMLVideoElementHost } from '../video-host';

export class SimpleSpfBackgroundVideoMedia extends BackgroundLoopingVideoMediaMixin(HTMLVideoElementHost) {}
