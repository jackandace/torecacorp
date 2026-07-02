// 卸取引 累計額(lifetime_amount) の一括取込 API (admin)
//
// email をキーに既存ショップの lifetime_amount を更新する。
// CSV / Excel いずれも対応。ヘッダから email 列・累計額列を柔軟に検出する。
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "9,780,306" "¥1,000円" 123 → 整数 (円) */
function parseAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.floor(value);
  const cleaned = String(value).replace(/[,\s¥円]/g, "");
  if (!/^-?\d+$/.test(cleaned)) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function pickKey(keys: string[], patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const hit = keys.find((k) => p.test(k));
    if (hit) return hit;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0]!;
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (rows.length === 0) {
    return NextResponse.json({ error: "データ行がありません" }, { status: 400 });
  }

  const keys = Object.keys(rows[0]!);
  const emailKey =
    pickKey(keys, [/mail/i, /メール/, /e-?mail/i]) ??
    keys.find((k) => rows.some((r) => typeof r[k] === "string" && String(r[k]).includes("@"))) ??
    null;
  const amountKey = pickKey(keys, [/累計/, /取引.*額|額.*取引/, /金額/, /amount/i, /total/i, /額/]);

  if (!emailKey || !amountKey) {
    return NextResponse.json(
      { error: `列を特定できません (email列: ${emailKey ?? "不明"} / 累計額列: ${amountKey ?? "不明"})。ヘッダ行に email と累計額の列を含めてください` },
      { status: 400 },
    );
  }

  // 取込データを整形 (email 正規化)
  type Row = { email: string; amount: number };
  const parsed: Row[] = [];
  const errors: string[] = [];
  const skipped: { title: string; reason: string }[] = [];
  for (const r of rows) {
    const email = r[emailKey] ? String(r[emailKey]).trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      skipped.push({ title: String(r[emailKey] ?? "(空)"), reason: "email が不正" });
      continue;
    }
    const amount = parseAmount(r[amountKey]);
    if (amount == null) {
      skipped.push({ title: email, reason: `累計額の解析失敗 [${r[amountKey]}]` });
      continue;
    }
    parsed.push({ email, amount });
  }

  // 既存ショップを email で一括取得
  const emails = [...new Set(parsed.map((p) => p.email))];
  const admin = createAdminClient();
  const { data: shops, error: fetchErr } = await admin
    .from("shops")
    .select("id, email, company_name, lifetime_amount")
    .in("email", emails.length > 0 ? emails : ["__none__"])
    .is("deleted_at", null);
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const byEmail = new Map((shops ?? []).map((s) => [(s.email ?? "").toLowerCase(), s]));

  const updated: { title: string; changes: string[] }[] = [];
  for (const row of parsed) {
    const shop = byEmail.get(row.email);
    if (!shop) {
      skipped.push({ title: row.email, reason: "該当ショップなし (未登録)" });
      continue;
    }
    if ((shop.lifetime_amount ?? 0) === row.amount) {
      // 変更なしでも「更新扱い(変更なし)」として可視化
      updated.push({ title: shop.company_name, changes: [] });
      continue;
    }
    const { error: upErr } = await admin
      .from("shops")
      .update({ lifetime_amount: row.amount })
      .eq("id", shop.id);
    if (upErr) {
      errors.push(`${shop.company_name}: ${upErr.message}`);
      continue;
    }
    updated.push({
      title: shop.company_name,
      changes: [`累計額: ¥${(shop.lifetime_amount ?? 0).toLocaleString()} → ¥${row.amount.toLocaleString()}`],
    });
  }

  await writeAudit(supabase, {
    adminId: user.id,
    action: "import_lifetime_amount",
    targetTable: "shops",
    targetId: null,
    after: { updated: updated.length, skipped: skipped.length, errors: errors.length, sheet: sheetName },
  });

  return NextResponse.json({
    summary: { inserted: 0, updated: updated.length, skipped: skipped.length, errors: errors.length },
    sheetUsed: sheetName,
    detected: { emailKey, amountKey },
    inserted: [],
    updated,
    skipped,
    errors,
  });
}
