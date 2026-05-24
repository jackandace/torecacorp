"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatJST } from "@/lib/dates";

interface Props {
  shopId: string;
  oathSignedAt: string | null;
  oathExpiresAt: string | null;
}

export function OathUploadShop({ shopId, oathSignedAt, oathExpiresAt }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setMessage({ kind: "err", text: "PDF を選択してください" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/oath", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "アップロード失敗");
      setMessage({ kind: "ok", text: "宣誓書をアップロードしました。失効日は管理者が確認次第設定します。" });
      setFile(null);
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-semibold">宣誓書</h2>
      {oathSignedAt ? (
        <div className="text-sm space-y-1 bg-emerald-50 border border-emerald-200 rounded p-3">
          <div className="text-emerald-800 font-medium">✓ 提出済み</div>
          <div className="text-xs text-slate-600">提出日: {formatJST(oathSignedAt)}</div>
          <div className="text-xs text-slate-600">失効日: {oathExpiresAt ?? "未設定 (管理者対応中)"}</div>
        </div>
      ) : (
        <div className="text-sm bg-amber-50 border border-amber-200 rounded p-3 text-amber-800">
          宣誓書が未提出です。下記からアップロードしてください。
        </div>
      )}

      <div className="space-y-3">
        <input
          type="file"
          accept="application/pdf"
          className="text-sm"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={!file || busy}
          onClick={handleUpload}
        >
          {busy ? "アップロード中…" : oathSignedAt ? "新しい宣誓書を再提出" : "アップロード"}
        </button>
        {message && (
          <p className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
            {message.text}
          </p>
        )}
      </div>
      <p className="text-xs text-slate-500">
        PDF 形式・20MB まで。提出後、管理者が失効日を確認・設定します。
      </p>
    </section>
  );
}
