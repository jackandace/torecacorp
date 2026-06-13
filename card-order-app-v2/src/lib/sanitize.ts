import DOMPurify from "isomorphic-dompurify";

// メール本文・マニュアルなど HTML をそのまま表示する箇所で使う共通サニタイザ。
// onerror 等のイベントハンドラ・script・iframe を除去し、Stored XSS を防ぐ。
const ALLOWED_TAGS = [
  "a", "b", "strong", "i", "em", "u", "s", "p", "br", "hr", "span", "div",
  "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
  "img",
];
const ALLOWED_ATTR = ["href", "title", "target", "rel", "src", "alt", "width", "height", "style", "class", "colspan", "rowspan"];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // javascript: スキームなどを除去
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}
