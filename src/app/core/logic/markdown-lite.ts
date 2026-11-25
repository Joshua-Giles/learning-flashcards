/**
 * Parser for the tiny markdown subset allowed in card `details`:
 * **bold**, *italic* and [links](https://…). Everything else is plain text.
 * Output is a list of segments rendered with Angular bindings (never innerHTML),
 * so set content can never inject HTML.
 */
export type MdSegment =
  { kind: 'text' | 'strong' | 'em'; text: string } | { kind: 'link'; text: string; href: string };

const TOKEN = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseMarkdownLite(source: string): MdSegment[] {
  const segments: MdSegment[] = [];
  let last = 0;

  for (const m of source.matchAll(TOKEN)) {
    const index = m.index ?? 0;
    if (index > last) segments.push({ kind: 'text', text: source.slice(last, index) });

    if (m[1] !== undefined) segments.push({ kind: 'strong', text: m[1] });
    else if (m[2] !== undefined) segments.push({ kind: 'em', text: m[2] });
    else segments.push({ kind: 'link', text: m[3], href: m[4] });

    last = index + m[0].length;
  }

  if (last < source.length) segments.push({ kind: 'text', text: source.slice(last) });
  return segments;
}
