"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ImportResult {
  summary: { inserted: number; updated: number; skipped: number; errors: number };
  inserted: string[];
  updated: { title: string; changes: string[] }[];
  skipped: { title: string; reason: string }[];
  errors: string[];
  notice?: string | null;
}

export function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "warn" | "err"; msg: string } | null>(null);

  // トースト自動消去
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setToast(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/import", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const json: ImportResult = await res.json();
      setResult(json);
      router.refresh();

      const { inserted, updated, skipped, errors } = json.summary;
      if (errors > 0) {
        setToast({ kind: "warn", msg: `取込完了: 新規 ${inserted} / 更新 ${updated} 件 (エラー ${errors} 件)` });
      } else {
        setToast({ kind: "ok", msg: `取込成功! 新規 ${inserted} 件 / 更新 ${updated} 件 / スキップ ${skipped} 件` });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "不明なエラー";
      setError(msg);
      setToast({ kind: "err", msg: `取込失敗: ${msg.slice(0, 60)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* トースト (画面右上に表示) */}
      {toast && (
        <div
          role="status"
          className={[
            "fixed top-4 right-4 z-50 max-w-md rounded-lg shadow-lg px-4 py-3 text-sm font-medium",
            "animate-in fade-in slide-in-from-top-2",
            toast.kind === "ok"   ? "bg-emerald-600 text-white" :
            toast.kind === "warn" ? "bg-amber-500 text-white" :
                                    "bg-rose-600 text-white",
          ].join(" ")}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">
              {toast.kind === "ok" ? "✓" : toast.kind === "warn" ? "⚠" : "✕"}
            </span>
            <span className="flex-1">{toast.msg}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 opacity-70 hover:opacity-100"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
          className="text-sm"
        />
        <button
          type="button"
          className="btn-primary"
          disabled={!file || busy}
          onClick={handleUpload}
        >
          {busy ? "取込中…" : "アップロード"}
        </button>
        {error && (
          <div className="text-sm text-rose-700 bg-rose-50 p-3 rounded">{error}</div>
        )}
      </div>

      {/* 結果サマリ + 詳細 */}
      {result && (
        <div className="card p-5 space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="新規追加" value={result.summary.inserted} tone="ok" />
            <StatCard label="更新" value={result.summary.updated} tone="info" />
            <StatCard label="スキップ" value={result.summary.skipped} tone="neutral" />
            <StatCard label="エラー" value={result.summary.errors} tone={result.summary.errors > 0 ? "err" : "neutral"} />
          </div>

          {result.notice && (
            <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3">
              ⚠ {result.notice}
            </div>
          )}

          {result.inserted.length > 0 && (
            <Section title={`✓ 新規追加 (${result.inserted.length} 件)`} initiallyOpen>
              <ul className="text-sm space-y-1">
                {result.inserted.map((t, i) => (
                  <li key={i} className="text-emerald-700">+ {t}</li>
                ))}
              </ul>
            </Section>
          )}

          {result.updated.length > 0 && (
            <Section title={`↻ 更新 (${result.updated.length} 件 / 既存と重複したため上書き)`} initiallyOpen>
              <ul className="text-sm space-y-2">
                {result.updated.map((u, i) => (
                  <li key={i} className="border-l-2 border-brand-300 pl-3">
                    <div className="font-medium text-slate-800">{u.title}</div>
                    {u.changes.length > 0 ? (
                      <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                        {u.changes.map((c, j) => <li key={j}>· {c}</li>)}
                      </ul>
                    ) : (
                      <div className="text-xs text-slate-500 mt-1">変更なし</div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {result.skipped.length > 0 && (
            <Section title={`− スキップ (${result.skipped.length} 件)`}>
              <ul className="text-sm space-y-1">
                {result.skipped.map((s, i) => (
                  <li key={i} className="text-slate-600">
                    <span className="text-slate-800">{s.title}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {result.errors.length > 0 && (
            <Section title={`✕ エラー (${result.errors.length} 件)`} initiallyOpen>
              <ul className="text-sm space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-rose-700">{e}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </>
  );
}

function StatCard({
  label, value, tone,
}: { label: string; value: number; tone: "ok" | "info" | "neutral" | "err" }) {
  const toneClass =
    tone === "ok"      ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
    tone === "info"    ? "border-brand-100 bg-brand-50 text-brand-700" :
    tone === "err"     ? "border-rose-200 bg-rose-50 text-rose-700" :
                         "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-xs">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

function Section({
  title, children, initiallyOpen,
}: { title: string; children: React.ReactNode; initiallyOpen?: boolean }) {
  return (
    <details open={initiallyOpen} className="border border-slate-200 rounded">
      <summary className="px-3 py-2 text-sm font-semibold cursor-pointer bg-slate-50 hover:bg-slate-100 rounded">
        {title}
      </summary>
      <div className="px-3 py-3">{children}</div>
    </details>
  );
}
