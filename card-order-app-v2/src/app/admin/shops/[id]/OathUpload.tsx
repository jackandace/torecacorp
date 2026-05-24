"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatJST } from "@/lib/dates";

interface Props {
  shopId: string;
  oathSignedAt: string | null;
  oathExpiresAt: string | null;
}

export function OathUpload({ shopId, oathSignedAt, oathExpiresAt }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [signedAt, setSignedAt] = useState<string>(
    oathSignedAt ? oathSignedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [expiresAt, setExpiresAt] = useState<string>(
    oathExpiresAt ?? new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setMessage("PDF を選択してください");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("signedAt", signedAt);
      fd.append("expiresAt", expiresAt);
      const res = await fetch(`/api/shops/${shopId}/oath`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "アップロード失敗");
      setMessage("登録しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/shops/${shopId}/oath/signed-url`);
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "URL 取得失敗");
      window.open(json.url, "_blank");
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      {oathSignedAt && (
        <div className="text-xs text-slate-600 space-y-1">
          <div>提出日: {formatJST(oathSignedAt)}</div>
          <div>失効日: {oathExpiresAt ?? "—"}</div>
          <button type="button" className="text-brand-600 hover:underline text-xs" onClick={handleDownload} disabled={busy}>
            提出済み PDF をダウンロード
          </button>
        </div>
      )}

      <div className="border-t pt-3 space-y-2">
        <p className="text-xs text-slate-600">
          {oathSignedAt ? "新しい宣誓書を再登録" : "宣誓書を登録"}
        </p>
        <input
          type="file"
          accept="application/pdf"
          className="text-xs"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-500 mb-0.5">提出日</label>
            <input type="date" className="input text-xs" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-0.5">失効日</label>
            <input type="date" className="input text-xs" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <button type="button" className="btn-secondary w-full text-sm" disabled={busy || !file} onClick={handleUpload}>
          {busy ? "処理中…" : "アップロード"}
        </button>
        {message && <p className="text-xs">{message}</p>}
      </div>
    </div>
  );
}
