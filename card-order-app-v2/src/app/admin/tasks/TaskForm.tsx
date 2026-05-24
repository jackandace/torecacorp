"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffTask, TaskCategory, TaskPriority, TaskStatus } from "@/types/database";
import { TASK_CATEGORY_LABEL, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/constants/business";

interface ShopOption { id: string; company_name: string }
interface UserOption { id: string; name: string }

export function TaskForm({
  mode, task, shops, users,
}: {
  mode: "create" | "edit";
  task?: StaffTask;
  shops: ShopOption[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [title, setTitle]             = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [category, setCategory]       = useState<TaskCategory>(task?.category ?? "other");
  const [status, setStatus]           = useState<TaskStatus>(task?.status ?? "open");
  const [priority, setPriority]       = useState<TaskPriority>(task?.priority ?? "normal");
  const [assignedTo, setAssignedTo]   = useState(task?.assigned_to ?? "");
  const [relatedShopId, setShop]      = useState(task?.related_shop_id ?? "");
  const [dueDate, setDueDate]         = useState(task?.due_date ?? "");
  const [busy, setBusy]               = useState(false);
  const [message, setMessage]         = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title) {
      setMessage("タイトルは必須です");
      return;
    }
    setBusy(true); setMessage(null);
    try {
      const payload = {
        title,
        description: description || null,
        category,
        status,
        priority,
        assignedTo: assignedTo || null,
        relatedShopId: relatedShopId || null,
        dueDate: dueDate || null,
      };
      const res = await fetch(mode === "create" ? "/api/tasks" : `/api/tasks/${task!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      router.push(mode === "create" ? "/admin/tasks" : `/admin/tasks/${task!.id}`);
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm("このタスクを削除しますか?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/admin/tasks");
    } catch (e) {
      setMessage(`削除失敗: ${e instanceof Error ? e.message : "不明"}`);
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4 text-sm">
      <div>
        <label className="block text-xs text-slate-600 mb-1">タイトル *</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ホビーステーション 5月分請求書発行" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">詳細</label>
        <textarea className="input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">カテゴリ</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)}>
            {(Object.keys(TASK_CATEGORY_LABEL) as TaskCategory[]).map((c) => (
              <option key={c} value={c}>{TASK_CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">優先度</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {(Object.keys(TASK_PRIORITY_LABEL) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">状態</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">担当者</label>
          <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">— 未割当 —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">関連ショップ</label>
          <select className="input" value={relatedShopId} onChange={(e) => setShop(e.target.value)}>
            <option value="">—</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">期日</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
            {busy ? "…" : mode === "create" ? "登録" : "保存"}
          </button>
          {message && <span className="text-xs text-rose-600">{message}</span>}
        </div>
        {mode === "edit" && (
          <button type="button" className="text-xs text-rose-600 hover:underline" disabled={busy} onClick={handleDelete}>
            削除
          </button>
        )}
      </div>
    </div>
  );
}
