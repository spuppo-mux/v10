import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { SimpleSpfBackgroundVideoMedia } from '@videojs/core/dom/media/simple-spf-background-video';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class SimpleSpfBackgroundVideo extends MediaAttachMixin(
  CustomMediaElement('video', SimpleSpfBackgroundVideoMedia)
) {}
