"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { TaskRow } from "./page";
import type { TaskStatus } from "@/types/database";
import {
  TASK_CATEGORY_LABEL, TASK_STATUS_LABEL, TASK_PRIORITY_LABEL,
  TASK_STATUS_TONE, TASK_PRIORITY_TONE,
} from "@/constants/business";
import { formatJST } from "@/lib/dates";

interface User { id: string; name: string }
interface Filters { status: string; category: string; assigned?: string }

export function TaskList({
  rows, users, filters, page, totalPages,
}: { rows: TaskRow[]; users: User[]; filters: Filters; page: number; totalPages: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") p.set(key, value);
    else p.delete(key);
    p.delete("page");
    router.push(`/admin/tasks?${p.toString()}`);
  };

  const setPage = (n: number) => {
    const p = new URLSearchParams(searchParams.toString());
    if (n <= 1) p.delete("page");
    else p.set("page", String(n));
    router.push(`/admin/tasks?${p.toString()}`);
  };

  const quickStatusChange = async (id: string, status: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      alert(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    }
  };

  const STATUSES: { v: string; label: string }[] = [
    { v: "all", label: "全部" },
    { v: "open", label: "未着手" },
    { v: "in_progress", label: "対応中" },
    { v: "done", label: "完了" },
    { v: "cancelled", label: "キャンセル" },
  ];
  const CATEGORIES = ["all", "invoice", "shipment", "oath", "survey", "inventory", "onboarding", "other"];

  return (
    <>
      <div className="card p-4 space-y-3 text-xs">
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s.v}
              onClick={() => updateFilter("status", s.v)}
              className={`px-3 py-1 rounded-full border ${
                filters.status === s.v
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >{s.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="text-slate-600">カテゴリ</span>
            <select className="border border-slate-300 rounded px-2 py-1" value={filters.category} onChange={(e) => updateFilter("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "全部" : TASK_CATEGORY_LABEL[c as keyof typeof TASK_CATEGORY_LABEL]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-slate-600">担当</span>
            <select className="border border-slate-300 rounded px-2 py-1" value={filters.assigned ?? ""} onChange={(e) => updateFilter("assigned", e.target.value || null)}>
              <option value="">全員</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 w-24">状態</th>
              <th className="text-left px-3 py-2 w-16">優先</th>
              <th className="text-left px-3 py-2">タイトル / カテゴリ</th>
              <th className="text-left px-3 py-2">担当</th>
              <th className="text-left px-3 py-2">関連ショップ</th>
              <th className="text-left px-3 py-2">期日</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const overdue = t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== "done";
              return (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <select
                      value={t.status}
                      onChange={(e) => quickStatusChange(t.id, e.target.value as TaskStatus)}
                      className={`text-xs rounded px-2 py-0.5 border ${TASK_STATUS_TONE[t.status]}`}
                    >
                      {(["open", "in_progress", "done", "cancelled"] as TaskStatus[]).map((s) => (
                        <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${TASK_PRIORITY_TONE[t.priority]}`}>
                      {TASK_PRIORITY_LABEL[t.priority]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/tasks/${t.id}`} className="text-brand-700 hover:underline font-medium">
                      {t.title}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">{TASK_CATEGORY_LABEL[t.category]}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{t.assignee_name ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {t.shop_name ? (
                      <Link href={`/admin/shops/${t.related_shop_id}`} className="text-brand-600 hover:underline">{t.shop_name}</Link>
                    ) : "—"}
                  </td>
                  <td className={`px-3 py-2 text-xs ${overdue ? "text-rose-700 font-semibold" : ""}`}>
                    {t.due_date ?? "—"}{overdue && " ⚠"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <Link href={`/admin/tasks/${t.id}`} className="text-brand-600 hover:underline">詳細</Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">該当タスクなし</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 text-sm">
          {page > 1 && <button onClick={() => setPage(page - 1)} className="btn-secondary text-xs">← 前</button>}
          <span className="text-slate-500">{page} / {totalPages}</span>
          {page < totalPages && <button onClick={() => setPage(page + 1)} className="btn-secondary text-xs">次 →</button>}
        </div>
      )}
    </>
  );
}
