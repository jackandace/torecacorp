// タイトル管理 (admin): 商品のシリーズをキーワードで「ポケモン / ワンピース / ヴァイス …」に括る
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TitlesManager } from "./TitlesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "タイトル管理 | 管理" };

export default async function TitlesPage() {
  const supabase = createClient();
  const [{ data: titles }, { data: products }] = await Promise.all([
    supabase.from("product_titles").select("*").order("sort_order").order("name"),
    supabase.from("products").select("title_group_id, series").is("deleted_at", null),
  ]);
  const count = new Map<string, number>();
  const seriesOf = new Map<string, Set<string>>();
  let unclassified = 0;
  for (const p of products ?? []) {
    if (!p.title_group_id) { unclassified++; continue; }
    count.set(p.title_group_id, (count.get(p.title_group_id) ?? 0) + 1);
    if (p.series) {
      if (!seriesOf.has(p.title_group_id)) seriesOf.set(p.title_group_id, new Set());
      seriesOf.get(p.title_group_id)!.add(p.series.trim());
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <Link href="/admin/notices" className="text-sm text-brand-600 hover:underline">← お知らせ管理</Link>
        <h1 className="text-2xl font-bold mt-1">タイトル管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          商品のシリーズ名（無ければ商品名）に<b>キーワード</b>が含まれていれば、そのタイトルに分類されます（上の行ほど優先）。
          どれにも当たらないシリーズの商品が追加されると、シリーズ名のタイトルが<b>自動で追加</b>されます（「自動追加」バッジ）。
          表記ゆれで別タイトルになったものは、まとめたい側のキーワードに追加して「再分類」→ 空になった方を削除してください。
        </p>
      </div>
      <TitlesManager
        titles={(titles ?? []).map((t) => ({
          id: t.id, name: t.name, keywords: t.keywords, sortOrder: t.sort_order, autoCreated: t.auto_created,
          products: count.get(t.id) ?? 0, series: [...(seriesOf.get(t.id) ?? [])].sort(),
        }))}
        unclassified={unclassified}
      />
    </div>
  );
}
