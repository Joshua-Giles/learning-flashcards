import { Component, computed, input } from '@angular/core';
import { parseMarkdownLite } from '../core/logic/markdown-lite';

/** Renders card `details` safely: **bold**, *italic*, [links](https://…). */
@Component({
  selector: 'lf-md',
  template: `@for (seg of segments(); track $index) {
    @switch (seg.kind) {
      @case ('strong') {
        <strong>{{ seg.text }}</strong>
      }
      @case ('em') {
        <em>{{ seg.text }}</em>
      }
      @case ('link') {
        @if (seg.kind === 'link') {
          <a [href]="seg.href" target="_blank" rel="noopener noreferrer" class="link">{{
            seg.text
          }}</a>
        }
      }
      @default {
        {{ seg.text }}
      }
    }
  }`,
})
export class MarkdownLite {
  readonly text = input.required<string>();
  protected readonly segments = computed(() => parseMarkdownLite(this.text()));
}
