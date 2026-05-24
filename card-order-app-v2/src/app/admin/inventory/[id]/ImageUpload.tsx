"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function ImageUpload({ productId, currentUrl }: { productId: string; currentUrl: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/products/${productId}/image`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "アップロード失敗");
      setMessage("アップロードしました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {currentUrl ? (
        <div className="relative w-full aspect-square bg-slate-100 rounded overflow-hidden">
          <Image src={currentUrl} alt="" fill className="object-contain" sizes="320px" unoptimized />
        </div>
      ) : (
        <div className="w-full aspect-square bg-slate-100 rounded flex items-center justify-center text-slate-400 text-sm">
          画像未登録
        </div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-xs"
      />
      <button
        type="button"
        className="btn-secondary w-full text-sm"
        disabled={!file || busy}
        onClick={handleUpload}
      >
        {busy ? "アップロード中…" : "アップロード"}
      </button>
      <p className="text-xs text-slate-500">
        アップロード時に幅 800px へ自動リサイズ・WebP 化されます。
      </p>
      {message && <p className="text-xs">{message}</p>}
    </div>
  );
}
