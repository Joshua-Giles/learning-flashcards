/**
 * Copies text to the clipboard. Uses the async Clipboard API when available,
 * falling back to a hidden textarea + execCommand. Resolves false if both fail
 * (the caller should then show the text for manual copying).
 */
export async function copyText(text: string, doc: Document = document): Promise<boolean> {
  try {
    if (doc.defaultView?.navigator.clipboard?.writeText) {
      await doc.defaultView.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context — try the fallback.
  }

  const area = doc.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  doc.body.appendChild(area);
  area.select();
  try {
    return doc.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
