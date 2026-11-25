import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Card } from '../../core/models/set';
import { FlipCard } from './flip-card';

@Component({
  imports: [FlipCard],
  template: `<lf-flip-card
    [card]="card"
    [flipped]="flipped()"
    [showHint]="hint()"
    (flip)="flips = flips + 1"
  />`,
})
class Host {
  card: Card = {
    id: 'c1',
    prompt: 'Which planet is red?',
    answer: 'Mars',
    hint: 'Roman god of war',
    details: 'It is **rusty** — see [NASA](https://nasa.gov). <img src=x onerror=alert(1)>',
  };
  flipped = signal(false);
  hint = signal(false);
  flips = 0;
}

async function render() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
  return { fixture, el, q, host: fixture.componentInstance };
}

describe('FlipCard', () => {
  it('shows the prompt on the front and hides the back from assistive tech', async () => {
    const { q } = await render();
    expect(q('card-front').textContent).toContain('Which planet is red?');
    expect(q('card-front').getAttribute('aria-hidden')).toBe('false');
    expect(q('card-back').getAttribute('aria-hidden')).toBe('true');
    expect(q('card-back').inert).toBe(true);
  });

  it('reflects the flipped input on the host and swaps aria-hidden', async () => {
    const { fixture, el, q, host } = await render();
    host.flipped.set(true);
    await fixture.whenStable();
    expect(el.querySelector('lf-flip-card')!.classList).toContain('flipped');
    expect(q('card-back').getAttribute('aria-hidden')).toBe('false');
    expect(q('card-back').inert).toBe(false);
  });

  it('emits flip on click, but not when a details link is clicked', async () => {
    const { el, host } = await render();
    el.querySelector<HTMLElement>('lf-flip-card')!.click();
    expect(host.flips).toBe(1);

    const link = el.querySelector<HTMLAnchorElement>('[data-testid="card-back"] a')!;
    link.addEventListener('click', (e) => e.preventDefault()); // don't navigate jsdom
    link.click();
    expect(host.flips).toBe(1);
  });

  it('renders details markdown safely (no HTML injection)', async () => {
    const { q } = await render();
    const back = q('card-back');
    expect(back.querySelector('strong')?.textContent).toBe('rusty');
    const link = back.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://nasa.gov');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(back.querySelector('img')).toBeNull();
    expect(back.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('only shows the hint when asked', async () => {
    const { fixture, q, host } = await render();
    expect(q('card-hint')).toBeNull();
    host.hint.set(true);
    await fixture.whenStable();
    expect(q('card-hint').textContent).toContain('Roman god of war');
  });
});
