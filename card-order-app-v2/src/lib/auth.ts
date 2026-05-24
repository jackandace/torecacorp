// 認証・ロール判定ヘルパ
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

export function getUserRole(user: User | null | undefined): UserRole {
  const role = user?.user_metadata?.role;
  if (role === "admin" || role === "super_admin") return role;
  return "shop";
}

export function isAdmin(user: User | null | undefined): boolean {
  const role = getUserRole(user);
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return getUserRole(user) === "super_admin";
}
