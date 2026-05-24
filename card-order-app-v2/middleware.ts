// ルートガード: ログイン要否・ロール分離
//
// 認証 / リダイレクトは各 layout (Server Component) で実施するため、
// middleware では Supabase クライアントを生成せず、cookies の維持だけ行う。
// これにより Edge Runtime 上の依存解決問題を回避する。
import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 静的アセットを除く全パス
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
