import { Injectable } from '@angular/core';
import { LocalDay } from './models/state';
import { toLocalDay } from './logic/local-day';

/** Injectable time source so tests can control "now" (streaks, day boundaries). */
@Injectable({ providedIn: 'root' })
export class Clock {
  now(): Date {
    return new Date();
  }

  today(): LocalDay {
    return toLocalDay(this.now());
  }
}
