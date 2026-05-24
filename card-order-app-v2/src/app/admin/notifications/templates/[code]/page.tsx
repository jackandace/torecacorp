import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "./TemplateEditor";
import { TEMPLATE_VARS } from "@/constants/notification-vars";

export const dynamic = "force-dynamic";

export default async function TemplateEditPage({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data: tpl } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("code", params.code)
    .maybeSingle();
  if (!tpl) notFound();

  const vars = TEMPLATE_VARS[tpl.code] ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/notifications/templates" className="text-sm text-brand-600 hover:underline">
          ← テンプレート一覧
        </Link>
        <h1 className="text-2xl font-bold mt-1">{tpl.name}</h1>
        <p className="text-xs text-slate-500 mt-1">コード: <span className="font-mono">{tpl.code}</span></p>
      </div>
      <TemplateEditor template={tpl} availableVars={vars} />
    </div>
  );
}
