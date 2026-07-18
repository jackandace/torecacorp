"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@/types/database";

type Row = Supplier & { userCount: number; productCount: number };

export function SupplierAdmin({ suppliers }: { suppliers: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", contactName: "", email: "", phone: "" });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function createSupplier() {
    if (!form.name.trim()) { setMsg({ kind: "err", text: "問屋名は必須です" }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "作成に失敗しました");
      setForm({ name: "", code: "", contactName: "", email: "", phone: "" });
      setMsg({ kind: "ok", text: `問屋「${json.supplier?.name}」を追加しました` });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "作成に失敗しました" });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {/* 新規問屋 */}
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">問屋を新規追加</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">問屋名 *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="株式会社アリイ 等" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">コード(任意)</label>
            <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A / B / C 等" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">担当者名(任意)</label>
            <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="橋本 様 等" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">メール(任意)</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">電話(任意)</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary text-sm" disabled={busy} onClick={createSupplier}>
            {busy ? "追加中…" : "問屋を追加"}
          </button>
          {msg && <span className={`text-xs ${msg.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</span>}
        </div>
      </section>

      {/* 一覧 */}
      <section className="space-y-3">
        <h2 className="font-semibold">登録済みの問屋 ({suppliers.length})</h2>
        {suppliers.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 text-sm">まだ問屋が登録されていません</div>
        ) : (
          suppliers.map((s) => <SupplierCard key={s.id} s={s} />)
        )}
      </section>
    </div>
  );
}

function SupplierCard({ s }: { s: Row }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState(s.contact_name ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function invite() {
    if (!email.trim() || !name.trim()) { setMsg({ kind: "err", text: "メール・担当者名は必須です" }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/suppliers/${s.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), displayName: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "招待に失敗しました");
      setMsg({
        kind: json.emailSent === false ? "err" : "ok",
        text: json.emailSent === false
          ? "紐付けは完了しましたが設定メールを送信できませんでした(送信制限の可能性)"
          : "招待メール(設定リンク)を送信し、問屋に紐付けました",
      });
      setEmail("");
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "招待に失敗しました" });
    } finally { setBusy(false); }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold">
            {s.name}
            {s.code && <span className="ml-2 text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{s.code}</span>}
            {!s.active && <span className="ml-2 text-xs bg-rose-100 text-rose-700 rounded px-1.5 py-0.5">停止中</span>}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            担当: {s.contact_name ?? "—"} / {s.email ?? "—"} / {s.phone ?? "—"}
          </div>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <div>担当者 {s.userCount} 名</div>
          <div>商品 {s.productCount} 件</div>
        </div>
      </div>

      <div className="border-t border-slate-100 mt-3 pt-3">
        {open ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <input className="input" type="email" placeholder="担当者メール" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input" placeholder="担当者名" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-primary text-xs" disabled={busy} onClick={invite}>
                {busy ? "招待中…" : "この問屋に招待"}
              </button>
              <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => setOpen(false)}>閉じる</button>
              {msg && <span className={`text-xs ${msg.kind === "ok" ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</span>}
            </div>
          </div>
        ) : (
          <button type="button" className="btn-secondary text-xs" onClick={() => setOpen(true)}>担当者を招待</button>
        )}
      </div>
    </div>
  );
}
