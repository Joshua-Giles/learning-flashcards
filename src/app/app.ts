import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { StorageService } from './core/storage.service';
import { Sidebar } from './shell/sidebar';
import { Toaster } from './shell/toaster';
import { TopBar } from './shell/top-bar';

@Component({
  selector: 'lf-root',
  imports: [RouterOutlet, RouterLink, TopBar, Sidebar, Toaster],
  host: { class: 'block min-h-dvh' },
  template: `
    <lf-top-bar />
    @if (!storage.available()) {
      <p
        role="alert"
        class="border-b border-line bg-danger/10 px-4 py-2 text-center text-sm"
        data-testid="storage-banner"
      >
        ⚠️ Your browser isn't letting this app save. Progress will be lost when you close the tab.
        Check that site storage isn't blocked (or that you're not in a private window).
      </p>
    }
    @if (storage.loadProblem(); as problem) {
      <p role="alert" class="border-b border-line bg-danger/10 px-4 py-2 text-center text-sm">
        ⚠️ Saved progress couldn't be read ({{ problem }}). It was backed up and you're starting
        fresh. <a routerLink="/settings" class="link">Settings</a>
      </p>
    }
    <div class="flex">
      <lf-sidebar />
      <main id="main" class="min-w-0 flex-1">
        <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <router-outlet />
        </div>
      </main>
    </div>
    <lf-toaster />
  `,
})
export class App {
  protected readonly storage = inject(StorageService);
}
