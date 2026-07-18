// 問屋(サプライヤー)コンテキストの解決ヘルパ
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Supplier } from "@/types/database";

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
