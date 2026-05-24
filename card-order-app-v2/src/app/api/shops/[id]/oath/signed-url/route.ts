// 宣誓書 PDF の最新ファイルに対する署名付き URL を取得
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { signedOathUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const adminSb = createAdminClient();
  const { data: files, error } = await adminSb.storage
    .from("oath-documents")
    .list(params.id, { limit: 1, sortBy: { column: "created_at", order: "desc" } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const latest = files?.[0]?.name;
  if (!latest) return NextResponse.json({ error: "宣誓書が登録されていません" }, { status: 404 });

  const url = await signedOathUrl({ supabase: adminSb, path: `${params.id}/${latest}` });
  return NextResponse.json({ url });
}
