"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CART_EVENT, loadCart } from "@/lib/cart-storage";
import { NOTICES_EVENT } from "@/lib/notices-client";

/** アイコン (24px, currentColor) */
const I = {
  order: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  ),
  cart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
  ),
  user: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  bell: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  ),
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] leading-[18px] text-center font-bold">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** お知らせの未読件数: ページ移動・既読操作のたびに取り直す */
function useUnreadNotices(enabled: boolean, pathname: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () =>
      fetch("/api/profile/notices/unread", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (alive && j) setCount((j.general ?? 0) + (j.personal ?? 0)); })
        .catch(() => { /* 取得失敗時は前の表示のまま */ });
    load();
    window.addEventListener(NOTICES_EVENT, load);
    return () => { alive = false; window.removeEventListener(NOTICES_EVENT, load); };
  }, [enabled, pathname]);
  return count;
}

/** ブラウザに保存されたカートの件数 (発注ページ・商品詳細・別タブの変更に追従) */
function useCartCount(shopId: string | null): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!shopId) return;
    const update = () => setCount(loadCart(shopId).length);
    update();
    window.addEventListener(CART_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CART_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [shopId]);
  return count;
}

/**
 * ショップ画面のナビ
 *   PC: 左にロゴ、右に「発注」・🔔お知らせ・🛒カート・👤マイページ (アイコンは件数バッジ付き)
 *   スマホ: 下部タブ (発注・お知らせ・カート・マイページ)
 * お問い合わせ・FAQ・マニュアル・プロフィール・ログアウトはマイページにまとめている。
 */
export function ShopNav({ shopId = null, noticesEnabled = false }: {
  shopId?: string | null;
  noticesEnabled?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const cartCount = useCartCount(shopId);
  const unread = useUnreadNotices(noticesEnabled, pathname);
  const noticeLabel = noticesEnabled ? "お知らせ" : "通知";

  const iconLink = (href: string, label: string, icon: React.ReactNode, n: number) => (
    <Link
      href={href}
      aria-label={n > 0 ? `${label} (${n}件)` : label}
      title={label}
      className={`relative p-2 rounded-full hover:bg-slate-100 ${isActive(pathname, href) ? "text-brand-600" : "text-slate-600"}`}
    >
      {icon}
      <Badge n={n} />
    </Link>
  );

  const tabs = [
    { href: "/order", label: "発注", icon: I.order, n: 0 },
    { href: "/notifications", label: noticeLabel, icon: I.bell, n: unread },
    { href: "/cart", label: "カート", icon: I.cart, n: cartCount },
    { href: "/mypage", label: "マイページ", icon: I.user, n: 0 },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <Link href="/order" className="font-bold text-sm sm:text-base">トレカ商事</Link>
          <nav className="hidden md:flex items-center gap-1" aria-label="メインメニュー">
            <Link
              href="/order"
              className={`px-3 py-1.5 mr-2 rounded-md text-sm font-medium ${isActive(pathname, "/order") ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"}`}
            >
              発注
            </Link>
            {iconLink("/notifications", noticeLabel, I.bell, unread)}
            {iconLink("/cart", "カート", I.cart, cartCount)}
            {iconLink("/mypage", "マイページ", I.user, 0)}
          </nav>
        </div>
      </header>

      {/* スマホ: 下部固定タブ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {tabs.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? "text-brand-600" : "text-slate-500"}`}>
                <span className="relative">{t.icon}<Badge n={t.n} /></span>
                <span className="leading-none">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
