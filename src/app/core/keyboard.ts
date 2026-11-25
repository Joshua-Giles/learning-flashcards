/**
 * True when a keyboard event should be left alone by page-level shortcuts:
 * the user is typing in a field, or holding a modifier (browser/OS shortcuts).
 */
export function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return true;
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    // Let a focused button (Space/Enter) or link (Enter) activate natively.
    (tag === 'BUTTON' && (event.key === ' ' || event.key === 'Enter')) ||
    (tag === 'A' && event.key === 'Enter')
  );
}
