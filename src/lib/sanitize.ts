/**
 * Conservative HTML sanitizer for admin-authored blog bodies.
 *
 * Runs on Cloudflare Workers, where DOM-based sanitizers (DOMPurify) aren't
 * available without a heavy jsdom dependency. Content here is only ever written
 * by an authenticated admin — this is defense-in-depth so a hijacked admin
 * session can't turn `set:html` on the public blog into persistent visitor XSS.
 *
 * Strategy: iteratively strip dangerous constructs until the output is stable,
 * so nested-tag smuggling (`<scr<script>ipt>`) can't reassemble after one pass.
 */

// Elements whose entire content is dangerous — removed with their bodies.
const DANGEROUS_BLOCKS = /<(script|style|iframe|object|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
// Stray open/close tags of dangerous elements (unclosed, self-closing, void).
const DANGEROUS_TAGS = /<\/?(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*>/gi;
// Inline event handlers: onerror=, onclick=, onload=… quoted or bare.
const EVENT_ATTRS = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// Executable URL schemes in href/src. data: is allowed only for images.
const BAD_URLS = /\s(href|src|xlink:href)\s*=\s*(["']?)\s*(?:javascript:|vbscript:|data:(?!image\/))[^"'\s>]*/gi;

export function sanitizeHtml(html: unknown): string {
  let out = typeof html === 'string' ? html : '';
  let prev = '';
  while (out !== prev) {
    prev = out;
    out = out
      .replace(DANGEROUS_BLOCKS, '')
      .replace(DANGEROUS_TAGS, '')
      .replace(EVENT_ATTRS, '')
      .replace(BAD_URLS, ' $1=$2#');
  }
  return out;
}
