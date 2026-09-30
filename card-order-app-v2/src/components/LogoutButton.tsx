"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ className, label = "ログアウト" }: { className?: string; label?: string } = {}) {
  const router = useRouter();
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className ?? "text-sm text-slate-600 hover:text-red-600"}
    >
      {label}
    </button>
  );
}
