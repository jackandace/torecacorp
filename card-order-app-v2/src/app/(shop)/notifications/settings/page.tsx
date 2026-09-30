// お知らせの受け取り設定 (新商品メール・希望タイトル)
import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNoticeAccess } from "@/lib/feature-flags";
import { getNoticePrefs } from "@/lib/notice-prefs";
import { NoticePrefsForm } from "./NoticePrefsForm";

export const metadata = { title: "お知らせの受け取り設定 | トレカ商事" };
export const dynamic = "force-dynamic";

export default async function NoticeSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: shop } = await supabase
    .from("shops").select("id, email").eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (!shop || !(await getNoticeAccess(shop.id)).enabled) redirect("/notifications");

  const admin = createAdminClient();
  const [prefs, { data: titles }] = await Promise.all([
    getNoticePrefs(admin, shop.id),
    admin.from("product_titles").select("id, name, sort_order").order("sort_order").order("name"),
  ]);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <BackLink href="/notifications" label="お知らせ" />
        <h1 className="text-2xl font-bold mt-1">お知らせの受け取り設定</h1>
        <p className="text-sm text-slate-500 mt-1">
          新商品のお知らせを受け取るタイトルと、メールの受け取りを設定できます。
          発注確定・発送・請求書などの「あなたへのお知らせ」は、この設定に関係なく届きます。
        </p>
      </div>
      <NoticePrefsForm
        email={shop.email ?? ""}
        initial={{ emailEnabled: prefs.email_enabled, titleMode: prefs.title_mode, titleIds: prefs.title_ids }}
        titles={(titles ?? []).map((t) => ({ id: t.id, name: t.name }))}
      />
    </div>
  );
}
