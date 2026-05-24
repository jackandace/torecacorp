/**
 * スモーク E2E
 *
 * 実 Supabase に依存しない範囲で:
 *   - ログイン画面のレンダリング
 *   - ヘルスチェック API
 *   - 認証ガード (未ログインでの /admin / /mypage アクセスが /login にリダイレクト)
 *   - ログインフォームのバリデーション (空送信時の HTML5 required)
 *
 * 認証が必要なフローのテストは、別途 Supabase ローカル or テスト用 DB を立てた上で
 * `auth/login.spec.ts` などに追加する想定。
 */
import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("ログイン画面が表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "トレカ商事カンパニー" })).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });

  test("/api/health が JSON を返す", async ({ request }) => {
    const res = await request.get("/api/health");
    // Supabase placeholder のため status は error 想定でも、形式は満たす
    expect(res.headers()["content-type"]).toContain("application/json");
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("db");
  });

  test("未ログインで /admin にアクセスすると /login にリダイレクト", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/);
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("未ログインで /mypage にアクセスすると /login にリダイレクト", async ({ page }) => {
    await page.goto("/mypage");
    await page.waitForURL(/\/login/);
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("ログインフォームに空送信するとブラウザのバリデーションで弾かれる", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "ログイン" }).click();
    // required 属性で submit が止まる。URL が変わらないことで判定。
    await page.waitForTimeout(200);
    expect(page.url()).toContain("/login");
  });
});
