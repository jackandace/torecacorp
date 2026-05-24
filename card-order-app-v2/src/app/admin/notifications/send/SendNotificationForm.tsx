"use client";

import { useState } from "react";

interface ShopOption {
  id: string;
  company_name: string;
  email: string | null;
  status: string;
}
interface TemplateOption {
  code: string;
  name: string;
  subject: string;
}

export function SendNotificationForm({ shops, templates }: { shops: ShopOption[]; templates: TemplateOption[] }) {
  const [templateCode, setTemplateCode] = useState(templates[0]?.code ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelected(new Set());
      setSelectAll(false);
    } else {
      setSelected(new Set(shops.filter((s) => s.status === "active" && s.email).map((s) => s.id)));
      setSelectAll(true);
    }
  };

  const handleSend = async () => {
    if (!templateCode || selected.size === 0) {
      setResult("テンプレートと送信先を選択してください");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateCode, shopIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      setResult(`送信完了: ${json.sent} 件 / 失敗: ${json.failed} 件`);
    } catch (e) {
      setResult(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-3">
        <label className="block text-xs text-slate-600 mb-1">テンプレート</label>
        <select className="input" value={templateCode} onChange={(e) => setTemplateCode(e.target.value)}>
          {templates.map((t) => (
            <option key={t.code} value={t.code}>{t.name} — {t.subject}</option>
          ))}
        </select>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">送信先 ({selected.size} 件選択中)</h2>
          <button type="button" className="text-xs text-brand-600 hover:underline" onClick={toggleAll}>
            {selectAll ? "選択解除" : "active 全選択"}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-slate-600">
            <tr>
              <th></th>
              <th className="text-left px-2 py-1">会社名</th>
              <th className="text-left px-2 py-1">メール</th>
              <th className="text-left px-2 py-1">状態</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-2 py-1">
                  <input
                    type="checkbox"
                    disabled={s.status === "suspended"}
                    checked={selected.has(s.id)}
                    onChange={() => handleToggle(s.id)}
                  />
                </td>
                <td className="px-2 py-1">{s.company_name}</td>
                <td className="px-2 py-1 text-xs text-slate-500">{s.email}</td>
                <td className="px-2 py-1">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy} onClick={handleSend}>
          {busy ? "送信中…" : `${selected.size} 件に送信`}
        </button>
        {result && <span className="text-sm">{result}</span>}
      </div>
    </div>
  );
}
