import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Temporary page for routes whose feature lands in a later task. */
@Component({
  selector: 'lf-coming-soon',
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">{{ heading() }}</h1>
    <p class="mt-2 text-muted">This part is still being built. 🚧</p>
    <a routerLink="/" class="link mt-4 inline-block">Back home</a>
  `,
})
export class ComingSoon {
  /** Bound from route `data.heading`. */
  readonly heading = input('Coming soon');
}
