// 管理画面マニュアル用の操作録画を配信 (admin のみ)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { LEGACY_MANUAL_MEDIA } from "@/manuals/legacy-purchase-media";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { name: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b64 = Object.prototype.hasOwnProperty.call(LEGACY_MANUAL_MEDIA, params.name) ? LEGACY_MANUAL_MEDIA[params.name] : undefined;
  if (!b64) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(b64, "base64")), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" },
  });
}
