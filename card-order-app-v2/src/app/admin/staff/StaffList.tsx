"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffRow } from "./page";
import { formatJST } from "@/lib/dates";

export function StaffList({ rows }: { rows: StaffRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left px-3 py-2">表示名</th>
            <th className="text-left px-3 py-2">メール</th>
            <th className="text-left px-3 py-2">ロール</th>
            <th className="text-left px-3 py-2">部署</th>
            <th className="text-left px-3 py-2">最終ログイン</th>
            <th className="text-left px-3 py-2">登録日</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            editingId === r.user_id ? (
              <EditRow
                key={r.user_id}
                row={r}
                busy={busy}
                onSave={async (changes) => {
                  setBusy(true); setMessage(null);
                  try {
                    const res = await fetch(`/api/staff/${r.user_id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(changes),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error ?? "失敗");
                    setEditingId(null);
                    setMessage("保存しました");
                    router.refresh();
                  } catch (e) {
                    setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
                  } finally { setBusy(false); }
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <tr key={r.user_id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{r.display_name ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-500 break-all">{r.email}</td>
                <td className="px-3 py-2">
                  <RoleBadge role={r.role} />
                  {!r.active && <span className="ml-2 text-xs text-slate-500">無効</span>}
                </td>
                <td className="px-3 py-2 text-xs">{r.department ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.last_sign_in ? formatJST(r.last_sign_in) : "—"}</td>
                <td className="px-3 py-2 text-xs">{formatJST(r.created_at)}</td>
                <td className="px-3 py-2">
                  <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditingId(r.user_id)}>
                    編集
                  </button>
                </td>
              </tr>
            )
          )}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">スタッフはまだいません</td></tr>
          )}
        </tbody>
      </table>
      {message && <p className="text-xs px-3 py-2 text-slate-600">{message}</p>}
    </div>
  );
}

function EditRow({ row, busy, onSave, onCancel }: { row: StaffRow; busy: boolean; onSave: (c: { displayName: string; department: string | null; role: StaffRow["role"]; active: boolean }) => void; onCancel: () => void }) {
  const [displayName, setDisplayName] = useState(row.display_name ?? "");
  const [department, setDepartment] = useState(row.department ?? "");
  const [role, setRole] = useState<StaffRow["role"]>(row.role);
  const [active, setActive] = useState(row.active);

  return (
    <tr className="border-t border-slate-100 bg-amber-50">
      <td className="px-3 py-2"><input className="input text-xs" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="表示名" /></td>
      <td className="px-3 py-2 text-xs text-slate-500 break-all">{row.email}</td>
      <td className="px-3 py-2">
        <select className="input text-xs w-32" value={role} onChange={(e) => setRole(e.target.value as StaffRow["role"])}>
          <option value="admin">admin</option>
          <option value="super_admin">super_admin</option>
          <option value="shop">shop (降格)</option>
        </select>
      </td>
      <td className="px-3 py-2"><input className="input text-xs" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="営業 / 経理 等" /></td>
      <td colSpan={2} className="px-3 py-2">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          有効
        </label>
      </td>
      <td className="px-3 py-2 space-x-1 whitespace-nowrap">
        <button
          className="btn-primary text-xs"
          disabled={busy || !displayName}
          onClick={() => onSave({ displayName, department: department || null, role, active })}
        >{busy ? "…" : "保存"}</button>
        <button className="btn-secondary text-xs" disabled={busy} onClick={onCancel}>キャンセル</button>
      </td>
    </tr>
  );
}

function RoleBadge({ role }: { role: StaffRow["role"] }) {
  const tone =
    role === "super_admin" ? "bg-violet-100 text-violet-800" :
    role === "admin"       ? "bg-blue-100 text-blue-800" :
                             "bg-slate-100 text-slate-700";
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${tone}`}>{role}</span>;
}
