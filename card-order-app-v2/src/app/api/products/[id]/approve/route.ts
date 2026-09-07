// 問屋登録商品の承認・公開 API (admin) — フェーズ4
//
// 承認 = is_approved:true + is_visible:true + status:受付中 (1操作で公開まで)。
// 公開前チェック (checkProductPublishable) のエラーがある場合は承認不可
// (掛け率0のまま等)。承認前に商品編集で掛け率・価格を設定すること。
//
// ⚠ テストモード: suppliers.is_test = true の問屋の登録商品は承認できない。
//   テスト入力が本番 (ショップ画面) に混入するのを構造的に防ぐ。
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { checkProductPublishable } from "@/lib/product-checks";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: product } = await supabase
    .from("products")
    .select("*, suppliers(name, is_test)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });

  const supplier = product.suppliers as unknown as { name?: string; is_test?: boolean } | null;
  if (supplier?.is_test) {
    return NextResponse.json(
      { error: "テスト問屋の登録データは公開できません (検証用のため)" },
      { status: 403 },
    );
  }
  if (product.is_approved) {
    return NextResponse.json({ error: "既に承認済みです" }, { status: 409 });
  }

  const check = checkProductPublishable(product);
  if (!check.ok) {
    return NextResponse.json(
      { error: "公開前チェックに未解決のエラーがあります。商品編集で設定してください", details: check.errors },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("products")
    .update({ is_approved: true, is_visible: true, status: "受付中" })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: `承認に失敗しました: ${error.message}` }, { status: 500 });

  await writeAudit(supabase, {
    adminId: user.id,
    action: "approve_supplier_product",
    targetTable: "products",
    targetId: params.id,
    after: { title: product.title, supplier: supplier?.name ?? null, warnings: check.warnings },
  });

  return NextResponse.json({ ok: true, warnings: check.warnings });
}
