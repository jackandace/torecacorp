// ショップ本人の API 共通: ログイン中ユーザーのショップを返す (無ければ null)
import { createClient } from "@/lib/supabase/server";

export async function getCurrentShop() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: shop } = await supabase
    .from("shops")
    .select("id, current_rank, created_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  return shop;
}
