import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('keeps benign article markup untouched', () => {
    const html = '<h2 id="intro">Başlık</h2><p>Merhaba <strong>dünya</strong></p><img src="/images/a.jpg" alt="a">';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('removes script blocks including their content', () => {
    expect(sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>')).toBe('<p>a</p><p>b</p>');
  });

  it('removes iframe/object/embed/style/form blocks', () => {
    expect(sanitizeHtml('<iframe src="https://evil.example"></iframe>ok')).toBe('ok');
    expect(sanitizeHtml('<style>body{display:none}</style>ok')).toBe('ok');
    expect(sanitizeHtml('<object data="x"></object><embed src="x"><form action="x"></form>ok')).toBe('ok');
  });

  it('strips inline event handlers', () => {
    expect(sanitizeHtml('<img src="/x.jpg" onerror="alert(1)">')).toBe('<img src="/x.jpg">');
    expect(sanitizeHtml("<div onclick='doEvil()'>t</div>")).toBe('<div>t</div>');
    expect(sanitizeHtml('<svg onload=alert(1)>')).toBe('<svg>');
  });

  it('neutralizes javascript: and vbscript: urls', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
    expect(sanitizeHtml("<a href='vbscript:x'>x</a>")).not.toContain('vbscript:');
  });

  it('blocks non-image data: urls but keeps data:image', () => {
    expect(sanitizeHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>')).not.toContain('data:text/html');
    const img = '<img src="data:image/png;base64,iVBORw0KGgo=">';
    expect(sanitizeHtml(img)).toBe(img);
  });

  it('survives nested-tag smuggling attempts', () => {
    const out = sanitizeHtml('<scr<script>ipt>alert(1)</scr</script>ipt>');
    expect(out.toLowerCase()).not.toMatch(/<script/);
  });

  it('handles null/undefined-ish input safely', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
  });
});
