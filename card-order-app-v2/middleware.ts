// ルートガード: ログイン要否・ロール分離
//
// 認証は各 layout (Server Component) でも実施されるが、middleware で先回り
// リダイレクトすることでサーバーレンダリングを 1 回節約する。
// Edge Runtime 上で動くため、外部 import は最小限にしてインライン化。
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/api/health"];

function isAdminRole(role: unknown): boolean {
  return role === "admin" || role === "super_admin";
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // 公開パスはスルー
    if (
      PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon")
    ) {
      return NextResponse.next();
    }

    // Cron API は middleware では通過させる (本体で CRON_SECRET 認証)
    if (pathname.startsWith("/api/cron")) {
      return NextResponse.next();
    }

    // 環境変数チェック (未設定なら認証スキップ)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error("[middleware] missing Supabase env vars");
      return NextResponse.next();
    }

    let response = NextResponse.next({ request });
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
    });

    const { data: { user } } = await supabase.auth.getUser();

    // 未ログインは /login へ
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // /admin 配下は admin / super_admin のみ
    if (pathname.startsWith("/admin") && !isAdminRole(user.user_metadata?.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/mypage";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (err) {
    // どんな例外もリクエストを通す (500 を避ける)
    console.error("[middleware] error:", err instanceof Error ? err.message : err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
