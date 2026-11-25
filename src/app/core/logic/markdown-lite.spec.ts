import { parseMarkdownLite } from './markdown-lite';

describe('parseMarkdownLite', () => {
  it('returns plain text unchanged', () => {
    expect(parseMarkdownLite('Just text.')).toEqual([{ kind: 'text', text: 'Just text.' }]);
  });

  it('parses bold, italic and links in order', () => {
    expect(
      parseMarkdownLite('It is **hot**, *really*. See [NASA](https://nasa.gov/venus) now'),
    ).toEqual([
      { kind: 'text', text: 'It is ' },
      { kind: 'strong', text: 'hot' },
      { kind: 'text', text: ', ' },
      { kind: 'em', text: 'really' },
      { kind: 'text', text: '. See ' },
      { kind: 'link', text: 'NASA', href: 'https://nasa.gov/venus' },
      { kind: 'text', text: ' now' },
    ]);
  });

  it('keeps HTML as literal text (rendered escaped by Angular)', () => {
    expect(parseMarkdownLite('<script>alert(1)</script>')).toEqual([
      { kind: 'text', text: '<script>alert(1)</script>' },
    ]);
  });

  it('only links http(s) URLs', () => {
    expect(parseMarkdownLite('[x](javascript:alert(1))')).toEqual([
      { kind: 'text', text: '[x](javascript:alert(1))' },
    ]);
  });

  it('does not treat a lone asterisk or "5 * 3" as italic', () => {
    expect(parseMarkdownLite('5 * 3 = 15')).toEqual([{ kind: 'text', text: '5 * 3 = 15' }]);
  });
});
