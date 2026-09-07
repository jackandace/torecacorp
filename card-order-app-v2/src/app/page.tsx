import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isSupplier } from "@/lib/auth";

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (isSupplier(user)) redirect("/supplier");
  redirect(isAdmin(user) ? "/admin" : "/mypage");
}
