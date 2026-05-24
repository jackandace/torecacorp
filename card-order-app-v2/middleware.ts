// ルートガード: ログイン要否・ロール分離
//
// 全ロジックをインライン化 (Edge Runtime の依存解決問題回避のため、
// 外部モジュールへの import を最小限に)
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/api/health"];

function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin" || role === "super_admin";
}

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

  // Supabase セッション取得 (Edge 対応)
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role as string | undefined;

  // 未ログインは /login へ
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // /admin 配下は admin / super_admin のみ
  if (pathname.startsWith("/admin") && !isAdminRole(role)) {
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
