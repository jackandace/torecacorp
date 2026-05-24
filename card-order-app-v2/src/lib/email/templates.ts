// 通知テンプレートのレンダリング (シンプルな {{key}} 置換)
//
// テンプレート本体は DB の notification_templates テーブルから取得する。
// この関数はあくまで変数差し込みのみを担当。
export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}
