"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  shopId: string;
  hasDoc: boolean;
}

export function BusinessDocUpload({ shopId, hasDoc }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/shops/${shopId}/business-doc`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      setMessage({ kind: "ok", text: "アップロードしました" });
      setFile(null);
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/shops/${shopId}/business-doc/signed-url`);
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "URL 取得失敗");
      window.open(json.url, "_blank");
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      {hasDoc ? (
        <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
          ✓ 提出済み
          <button type="button" onClick={handleDownload} disabled={busy} className="ml-2 underline">
            PDF を開く
          </button>
        </div>
      ) : (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          未提出
        </div>
      )}
      <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
      <button type="button" className="btn-secondary w-full text-xs" disabled={busy || !file} onClick={handleUpload}>
        {busy ? "処理中…" : hasDoc ? "差し替えアップロード" : "アップロード"}
      </button>
      {message && (
        <p className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
