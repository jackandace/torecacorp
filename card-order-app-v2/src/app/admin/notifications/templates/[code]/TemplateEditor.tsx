"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationTemplate } from "@/types/database";
import { renderTemplate } from "@/lib/email/templates";
import { sanitizeHtml } from "@/lib/sanitize";

interface Props {
  template: NotificationTemplate;
  availableVars: string[];
}

export function TemplateEditor({ template, availableVars }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [bodyText, setBodyText] = useState(template.body_text ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // プレビュー用ダミー値
  const sampleVars = useMemo(() => {
    const v: Record<string, string> = {};
    for (const k of availableVars) {
      switch (k) {
        case "company_name":     v[k] = "サンプル商店"; break;
        case "order_count":      v[k] = "3"; break;
        case "product_titles":   v[k] = "商品A, 商品B"; break;
        case "product_title":    v[k] = "サンプル商品"; break;
        case "provisional_qty":  v[k] = "12"; break;
        case "confirmed_qty":    v[k] = "24"; break;
        case "tracking_number":  v[k] = "ABCD1234567"; break;
        case "invoice_number":   v[k] = "INV-202605-0001"; break;
        case "total_amount":     v[k] = "1,234,567"; break;
        case "due_date":         v[k] = "2026-06-30"; break;
        case "prev_rank":        v[k] = "シルバー"; break;
        case "new_rank":         v[k] = "ゴールド"; break;
        case "rebate_rate":      v[k] = "7%"; break;
        case "monthly_amount":   v[k] = "550,000"; break;
        case "days_until_expiry":v[k] = "14"; break;
        case "expiry_date":      v[k] = "2026-06-15"; break;
        default:                 v[k] = `[${k}]`;
      }
    }
    return v;
  }, [availableVars]);

  const previewSubject = renderTemplate(subject, sampleVars);
  const previewHtml = sanitizeHtml(renderTemplate(bodyHtml, sampleVars, true));

  const handleSave = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/notification-templates/${template.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          bodyHtml,
          bodyText: bodyText || null,
          lastUpdatedAt: template.updated_at,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "保存失敗");
      setMessage("保存しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="card p-5 space-y-3 text-sm">
        <h2 className="font-semibold">編集</h2>
        <div>
          <label className="block text-xs text-slate-600 mb-1">件名</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">本文 (HTML)</label>
          <textarea
            className="input font-mono text-xs"
            rows={10}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">本文 (テキスト)</label>
          <textarea
            className="input font-mono text-xs"
            rows={6}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
        </div>
        <div>
          <p className="text-xs text-slate-600 mb-1">利用可能な変数:</p>
          <div className="flex flex-wrap gap-1">
            {availableVars.map((v) => (
              <code key={v} className="text-xs bg-slate-100 px-2 py-0.5 rounded">{`{{${v}}}`}</code>
            ))}
            {availableVars.length === 0 && (
              <span className="text-xs text-slate-500">変数は定義されていません</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={handleSave}>
            {busy ? "保存中…" : "保存"}
          </button>
          {message && <span className="text-xs">{message}</span>}
        </div>
      </section>

      <section className="card p-5 space-y-3 text-sm">
        <h2 className="font-semibold">プレビュー (サンプル値での差し込み)</h2>
        <div>
          <div className="text-xs text-slate-500">件名</div>
          <div className="font-medium">{previewSubject}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">本文</div>
          <div
            className="border border-slate-200 rounded p-3 bg-white text-sm prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </section>
    </div>
  );
}
