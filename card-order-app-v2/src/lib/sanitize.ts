import sanitizeHtmlLib from "sanitize-html";

// メール本文・マニュアルなど HTML をそのまま表示する箇所で使う共通サニタイザ。
// onerror 等のイベントハンドラ・script・iframe を除去し、Stored XSS を防ぐ。
//
// 以前は isomorphic-dompurify を使っていたが、サーバー側で jsdom を必要とし
// Vercel サーバーレスで実行時エラー (500) を起こすため、jsdom 不要で
// サーバー/クライアント両対応の pure-JS な sanitize-html へ移行した。
const ALLOWED_TAGS = [
  "a", "b", "strong", "i", "em", "u", "s", "p", "br", "hr", "span", "div",
  "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
  "img",
];
const ALLOWED_ATTR = [
  "href", "title", "target", "rel", "src", "alt", "width", "height",
  "style", "class", "colspan", "rowspan",
];

const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: { "*": ALLOWED_ATTR },
  // javascript: などの危険スキームを除外 (許可したものだけ通す)
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: true,
  // script/style 等はタグごと中身も破棄 (デフォルト挙動を明示)
  disallowedTagsMode: "discard",
};

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return sanitizeHtmlLib(dirty, OPTIONS);
}
