"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LogoutButton } from "@/components/LogoutButton";

interface NavItem {
  href: string;
  label: string;
  superOnly?: boolean;
}

interface Props {
  nav: NavItem[];
  email: string;
  superAdmin: boolean;
}

export function AdminSidebar({ nav, email, superAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // ルート変更で自動で閉じる
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items = nav.filter((n) => !n.superOnly || superAdmin);

  return (
    <>
      {/* SP 用トップバー (ハンバーガー + タイトル) */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-slate-900 text-slate-100 shadow">
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded hover:bg-slate-800"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span className="font-bold">トレカ商事 | 管理</span>
        <div className="w-8" />
      </header>

      {/* オーバーレイ (SP のみ) */}
      {open && (
        <div
          aria-hidden
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={[
          "fixed top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100 z-50 flex flex-col",
          "transition-transform duration-200",
          "lg:translate-x-0 lg:sticky lg:z-0 lg:w-56",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="px-4 h-14 flex items-center justify-between font-bold border-b border-slate-800">
          <span>トレカ商事 | 管理</span>
          <button
            type="button"
            aria-label="メニューを閉じる"
            className="lg:hidden p-2 -mr-2 rounded hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {items.map((n) => {
              const active = pathname === n.href || (n.href !== "/admin" && pathname.startsWith(`${n.href}/`)) || (n.href === "/admin" && pathname === "/admin");
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={[
                      "block px-4 py-2 text-sm transition",
                      active ? "bg-slate-800 text-white border-l-2 border-brand-500" : "hover:bg-slate-800",
                    ].join(" ")}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="px-4 py-4 border-t border-slate-800 text-xs">
          <div className="mb-2 text-slate-400 break-all">{email}</div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
