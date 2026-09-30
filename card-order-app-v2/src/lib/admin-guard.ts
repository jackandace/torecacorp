// 管理 API 共通: ログイン中の管理者を返す (管理者でなければ null)
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

export async function requireAdminUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user: user && isAdmin(user) ? user : null };
}
