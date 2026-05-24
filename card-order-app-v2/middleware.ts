// ルートガード: ログイン要否・ロール分離
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isAdmin } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/api/health"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的ファイル・公開パスはスルー
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Cron API は CRON_SECRET ヘッダで認証 (middleware では通過させる)
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  // 未ログインは /login へ
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // /admin 配下は admin / super_admin のみ
  if (pathname.startsWith("/admin") && !isAdmin(user)) {
    const url = request.nextUrl.clone();
    url.pathname = "/mypage";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // 静的アセットを除く全パス
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
