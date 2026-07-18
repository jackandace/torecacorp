// 問屋(サプライヤー)コンテキストの解決ヘルパ
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Supplier } from "@/types/database";

/** API/ページ用: ログイン中ユーザーの {userId, supplierId} を返す (問屋でなければ null)。
 *  ユーザーセッション(RLS)で自分の supplier_users を参照。以降の業務データ取得は
 *  supplier_id で明示スコープしたうえでサービスロールで行う。 */
export async function getSupplierContext(
  supabase: SupabaseClient<Database>,
): Promise<{ userId: string; supplierId: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("supplier_users").select("supplier_id").eq("user_id", user.id).maybeSingle();
  if (!data?.supplier_id) return null;
  return { userId: user.id, supplierId: data.supplier_id };
}

/** ログイン中の問屋ユーザーの所属問屋を返す (問屋でない/未設定なら null) */
export async function getCurrentSupplier(
  supabase: SupabaseClient<Database>,
): Promise<{ supplier: Supplier; displayName: string | null } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("supplier_users")
    .select("display_name, suppliers(*)")
    .eq("user_id", user.id)
    .maybeSingle();
  const supplier = (data?.suppliers as unknown as Supplier | null) ?? null;
  if (!supplier) return null;
  return { supplier, displayName: data?.display_name ?? null };
}
