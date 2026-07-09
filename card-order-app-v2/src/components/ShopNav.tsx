"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

/** アイコン (24px, currentColor) */
const I = {
  cart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
  ),
  user: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  ),
  bell: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  ),
  menu: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  ),
};

// PC 上部ナビ / ドロワー共通のリンク
const LINKS = [
  { href: "/order", label: "発注" },
  { href: "/mypage", label: "マイページ" },
  { href: "/inquiries", label: "お問い合わせ" },
  { href: "/faq", label: "FAQ" },
  { href: "/notifications", label: "通知" },
  { href: "/manual", label: "マニュアル" },
  { href: "/profile", label: "プロフィール" },
];

// モバイル下部の固定タブ (よく使う4つ)
const TABS = [
  { href: "/order", label: "発注", icon: I.cart },
  { href: "/mypage", label: "マイページ", icon: I.user },
  { href: "/inquiries", label: "お問い合わせ", icon: I.chat },
  { href: "/notifications", label: "通知", icon: I.bell },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function ShopNav() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  // ページ遷移でドロワーを閉じる
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/order" className="font-bold text-sm sm:text-base">トレカ商事</Link>

          {/* PC: 横並びナビ */}
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={`hover:text-brand-600 ${isActive(pathname, l.href) ? "text-brand-600 font-semibold" : ""}`}>
                {l.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>

          {/* モバイル: ハンバーガー */}
          <button
            type="button"
            className="md:hidden p-2 -mr-2 rounded hover:bg-slate-100"
            aria-label="メニューを開く"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            {I.menu}
          </button>
        </div>
      </header>

      {/* モバイル ドロワー */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 max-w-[80%] bg-white shadow-xl flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="font-bold">メニュー</span>
              <button type="button" className="p-2 -mr-2 rounded hover:bg-slate-100" aria-label="閉じる" onClick={() => setOpen(false)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`block px-5 py-3 text-[15px] border-b border-slate-100 ${isActive(pathname, l.href) ? "text-brand-600 font-semibold bg-brand-50" : "text-slate-700"}`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}

      {/* モバイル 下部固定タブ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? "text-brand-600" : "text-slate-500"}`}>
                {t.icon}
                <span className="leading-none">{t.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-slate-500">
            {I.menu}
            <span className="leading-none">メニュー</span>
          </button>
        </div>
      </nav>
    </>
  );
}
