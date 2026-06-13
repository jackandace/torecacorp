// 通知テンプレートのレンダリング ({{key}} 置換)
//
// テンプレート本体は DB の notification_templates から取得する。
// この関数は変数差し込みのみを担当。

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * {{key}} を vars で置換する。
 * @param escape true の場合、差し込む値を HTML エスケープする (HTML 本文用)。
 *               会社名・商品名など DB 由来の値経由の Stored XSS を防ぐ。
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
  escape = false,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    if (v == null) return "";
    const s = String(v);
    return escape ? escapeHtml(s) : s;
  });
}
