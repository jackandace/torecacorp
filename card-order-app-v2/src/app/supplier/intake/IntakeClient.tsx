"use client";

// 入荷登録クライアント: フォーム入力 / Excel一括 の2方式 + 登録済み一覧
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Row {
  id: string;
  series: string | null;
  title: string;
  modelNumber: string | null;
  price: number | null;
  ctToBox: number;
  plannedQty: number | null;
  imageUrl: string | null;
  approved: boolean;
  visible: boolean;
}

const EMPTY_FORM = {
  series: "",
  title: "",
  modelNumber: "",
  janCode: "",
  price: "",
  ctToBox: "",
  minOrderBox: "",
  plannedQty: "",
  releaseDate: "",
  orderDeadline: "",
  flowType: "haibun" as "haibun" | "cut",
  note: "",
};

export function IntakeClient({ isTest, products }: { isTest: boolean; products: Row[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"form" | "excel">("form");
  const [f, setF] = useState({ ...EMPTY_FORM });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelResult, setExcelResult] = useState<{ inserted: number; titles: string[]; skipped: { row: number; reason: string }[] } | null>(null);

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));
  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

  async function submitForm() {
    if (!f.title.trim()) {
      setMsg({ kind: "err", text: "商品名は必須です" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/supplier/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: f.series.trim() || undefined,
          title: f.title.trim(),
          modelNumber: f.modelNumber.trim() || undefined,
          janCode: f.janCode.trim() || undefined,
          price: num(f.price) ?? null,
          ctToBox: num(f.ctToBox),
          minOrderBox: num(f.minOrderBox),
          plannedQty: num(f.plannedQty) ?? null,
          releaseDate: f.releaseDate || null,
          orderDeadline: f.orderDeadline || null,
          flowType: f.flowType,
          note: f.note.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "登録に失敗しました");

      // 画像があれば続けてアップロード
      if (imageFile && json.id) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const imgRes = await fetch(`/api/supplier/intake/${json.id}/image`, { method: "POST", body: fd });
        if (!imgRes.ok) {
          const j = await imgRes.json().catch(() => ({}));
          setMsg({ kind: "err", text: `商品は登録されましたが画像のみ失敗: ${j.error ?? "不明"}` });
          setF({ ...EMPTY_FORM });
          setImageFile(null);
          if (imageRef.current) imageRef.current.value = "";
          router.refresh();
          return;
        }
      }
      setMsg({ kind: "ok", text: "登録しました。トレカ商事の承認後に公開されます" });
      setF({ ...EMPTY_FORM });
      setImageFile(null);
      if (imageRef.current) imageRef.current.value = "";
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "登録に失敗しました" });
    } finally {
      setBusy(false);
    }
  }

  async function submitExcel() {
    if (!excelFile) return;
    setBusy(true);
    setMsg(null);
    setExcelResult(null);
    try {
      const fd = new FormData();
      fd.append("file", excelFile);
      const res = await fetch("/api/supplier/intake/import", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "取込に失敗しました");
      setExcelResult(json);
      setMsg({ kind: "ok", text: `${json.inserted} 件登録しました。トレカ商事の承認後に公開されます` });
      setExcelFile(null);
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "取込に失敗しました" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">入荷登録</h1>
        <p className="text-sm text-slate-500 mt-1">
          新商品を登録すると「承認待ち」になり、トレカ商事の確認後にショップへ公開されます。
          {isTest && <span className="text-amber-700 font-semibold">（テストモードのため公開はされません）</span>}
        </p>
      </div>

      {/* 方式タブ */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("form")}
          className={`px-4 py-2 rounded-md text-sm font-semibold ${tab === "form" ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`}>
          📝 フォームで1件ずつ
        </button>
        <button type="button" onClick={() => setTab("excel")}
          className={`px-4 py-2 rounded-md text-sm font-semibold ${tab === "excel" ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`}>
          📊 Excelで一括登録
        </button>
      </div>

      {msg && (
        <p className={`text-sm rounded-md p-3 ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{msg.text}</p>
      )}

      {tab === "form" ? (
        <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-600 mb-1">シリーズ (ゲームタイトル)</label>
            <input className="input" value={f.series} onChange={set("series")} placeholder="ポケモンカード 等" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">商品名 *</label>
            <input className="input" value={f.title} onChange={set("title")} placeholder="拡張パック ○○○ BOX" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">型番</label>
            <input className="input" value={f.modelNumber} onChange={set("modelNumber")} placeholder="SV11 等" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">JANコード</label>
            <input className="input" value={f.janCode} onChange={set("janCode")} inputMode="numeric" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">定価 (税抜・円)</label>
            <input className="input" type="number" min={0} value={f.price} onChange={set("price")} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">カートンあたりBOX数</label>
            <input className="input" type="number" min={1} value={f.ctToBox} onChange={set("ctToBox")} placeholder="12 / 20 / 24 等" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">最低発注数 (BOX)</label>
            <input className="input" type="number" min={1} value={f.minOrderBox} onChange={set("minOrderBox")} placeholder="未入力ならカートン数と同じ" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">発注可能数 (BOX)</label>
            <input className="input" type="number" min={0} value={f.plannedQty} onChange={set("plannedQty")} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">発売日</label>
            <input className="input" type="date" value={f.releaseDate} onChange={set("releaseDate")} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">発注締切日</label>
            <input className="input" type="date" value={f.orderDeadline} onChange={set("orderDeadline")} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">区分</label>
            <select className="input" value={f.flowType} onChange={set("flowType")}>
              <option value="haibun">配分 (数量確定)</option>
              <option value="cut">カット (数量変動あり)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">商品画像 (任意・10MBまで)</label>
            <input ref={imageRef} className="text-xs" type="file" accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">トレカ商事へのメモ (任意)</label>
            <input className="input" value={f.note} onChange={set("note")} placeholder="出荷時期・注意事項など" maxLength={500} />
          </div>
          <div className="sm:col-span-2">
            <button type="button" className="btn-primary w-full sm:w-auto" disabled={busy} onClick={submitForm}>
              {busy ? "登録中…" : "この内容で登録する"}
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5 space-y-4 text-sm">
          <div className="rounded-md bg-slate-50 border border-slate-200 p-4 text-xs leading-relaxed">
            <p className="font-semibold mb-1">Excelの列構成 (1行目は見出し行として読み飛ばします)</p>
            <p className="font-mono">
              A: シリーズ / B: 商品名(必須) / C: 型番 / D: JANコード / E: 定価(税抜) /<br />
              F: カートンBOX数 / G: 最低発注数 / H: 発注可能数(BOX) / I: 発売日 / J: 配分 or カット / K: 備考
            </p>
            <p className="mt-1 text-slate-500">1回の取込は200行まで。空欄の数値はカートン12等の既定値になります。</p>
          </div>
          <input type="file" accept=".xlsx,.xls" className="text-xs"
            onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)} />
          <button type="button" className="btn-primary" disabled={busy || !excelFile} onClick={submitExcel}>
            {busy ? "取込中…" : "Excelを取込む"}
          </button>
          {excelResult && (
            <div className="text-xs space-y-1">
              <p className="text-emerald-700 font-semibold">✔ {excelResult.inserted} 件登録</p>
              {excelResult.skipped.length > 0 && (
                <ul className="text-amber-700">
                  {excelResult.skipped.map((s, i) => <li key={i}>行{s.row}: {s.reason}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* 登録済み一覧 */}
      <section className="card p-5">
        <h2 className="font-semibold mb-3">登録済みの商品 ({products.length} 件)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="text-slate-600 bg-slate-50">
              <tr>
                <th className="text-left px-2 py-2">商品</th>
                <th className="text-right px-2 py-2">定価</th>
                <th className="text-right px-2 py-2">CT/BOX</th>
                <th className="text-right px-2 py-2">数量</th>
                <th className="text-center px-2 py-2">画像</th>
                <th className="text-left px-2 py-2">状態</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <span className="text-xs text-slate-500">{p.series ? `[${p.series}] ` : ""}</span>
                    {p.title}
                    {p.modelNumber && <span className="text-xs text-slate-400 ml-1">({p.modelNumber})</span>}
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{p.price != null ? `¥${p.price.toLocaleString()}` : "—"}</td>
                  <td className="px-2 py-2 text-right">{p.ctToBox}</td>
                  <td className="px-2 py-2 text-right">{p.plannedQty ?? "—"}</td>
                  <td className="px-2 py-2 text-center">{p.imageUrl ? "🖼" : "—"}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {p.approved ? (
                      p.visible
                        ? <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">公開中</span>
                        : <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">承認済(非公開)</span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">承認待ち</span>
                    )}
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-6 text-center text-slate-400">まだ登録がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
