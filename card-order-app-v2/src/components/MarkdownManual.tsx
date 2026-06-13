import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Markdown 文字列を整形済み HTML として描画する。
 * マニュアルは社内・加盟店向けの静的コンテンツのため、信頼できるソース
 * (リポジトリ内の docs/*.md) のみを渡す前提で dangerouslySetInnerHTML を使う。
 */
export function MarkdownManual({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown) as string;
  return (
    <article
      className="manual-prose bg-white rounded-xl shadow-sm p-6 sm:p-10"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
