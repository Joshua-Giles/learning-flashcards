import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './shell/sidebar';
import { TopBar } from './shell/top-bar';

@Component({
  selector: 'lf-root',
  imports: [RouterOutlet, TopBar, Sidebar],
  host: { class: 'block min-h-dvh' },
  template: `
    <lf-top-bar />
    <div class="flex">
      <lf-sidebar />
      <main id="main" class="min-w-0 flex-1">
        <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class App {}
