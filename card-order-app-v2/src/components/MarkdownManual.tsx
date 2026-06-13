import { marked } from "marked";
import { sanitizeHtml } from "@/lib/sanitize";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Markdown 文字列を整形済み HTML として描画する。
 * マニュアルは信頼できるソース (リポジトリ内 docs/*.md) 由来だが、
 * 多層防御として描画前に必ずサニタイズする。
 */
export function MarkdownManual({ markdown }: { markdown: string }) {
  const html = sanitizeHtml(marked.parse(markdown) as string);
  return (
    <article
      className="manual-prose bg-white rounded-xl shadow-sm p-6 sm:p-10"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
