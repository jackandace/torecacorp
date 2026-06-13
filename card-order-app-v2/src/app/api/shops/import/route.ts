// 顧客 (ショップ) 取込 API
//
// 受付フォーマット:
//   1. CSV         — 既存 (company_name, contact_name, email, phone, address, delivery_address, current_rank, status)
//   2. Excel (.xlsx) — Google フォーム出力の "顧客マスター" or "卸_ショップ登録フォーム" シートを自動検出
//
// 動作:
//   - 既存ショップは email でマッチして UPDATE
//   - 新規は INSERT し、Supabase Auth ユーザーも作成 (招待メールは送らない)
//   - 結果は { summary, inserted[], updated[], skipped[], errors[] } 形式
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth";
import { fromCsv } from "@/lib/csv";
import type { RankCode, ShopStatus } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_RANKS: RankCode[] = ["platinum", "gold", "silver", "bronze", "standard"];
const VALID_STATUSES: ShopStatus[] = ["pending", "active", "suspended"];

function normalizeRank(v: string | undefined): RankCode {
  return (VALID_RANKS as string[]).includes(v ?? "") ? (v as RankCode) : "standard";
}
function normalizeStatus(v: string | undefined): ShopStatus {
  return (VALID_STATUSES as string[]).includes(v ?? "") ? (v as ShopStatus) : "pending";
}

/** 郵便番号: 数値 2790043 → "279-0043", 既にハイフン付きならそのまま */
function normalizePostal(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (/^\d{3}-\d{4}$/.test(s)) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return s;
}

function normalizePhone(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v).trim();
}

/**
 * true 判定: "true" / "ture" (typo) / 1 / "○" / boolean true 等
 * 注意: 大きな数値 (Excel 日付シリアル値など) は false 扱いにする
 */
function asBool(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "number") return v === 1;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t === "true" || t === "ture" || t === "yes" || t === "1" || t === "○";
}

interface ShopRow {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  delivery_address: string | null;
  current_rank: RankCode;
  status: ShopStatus;
}

// ============================================================
// CSV パース
// ============================================================
function parseCsvRows(text: string): ShopRow[] {
  return fromCsv(text)
    .map((row) => {
      const email = row.email?.trim().toLowerCase();
      if (!email) return null;
      const company = row.company_name?.trim();
      const contact = row.contact_name?.trim();
      if (!company || !contact) return null;
      return {
        company_name: company,
        contact_name: contact,
        email,
        phone: row.phone?.trim() || null,
        address: row.address?.trim() || null,
        delivery_address: row.delivery_address?.trim() || null,
        current_rank: normalizeRank(row.current_rank?.trim()),
        status: normalizeStatus(row.status?.trim()),
      } satisfies ShopRow;
    })
    .filter((r): r is ShopRow => r !== null);
}

// ============================================================
// Excel パース (Google フォーム形式)
// ============================================================
//
// 顧客マスター / 卸_ショップ登録フォーム の両方に対応。
// 実データでは途中の行から列が 1 つずれている (承認列が欠落) ため、
// メールアドレスが含まれる列を行単位で自動検出する。
//
// レイアウト A (承認列あり):
//   D=承認済 E=電話 F=メール G=請求書先 H=郵便1 I=住所1 J=郵便2 K=住所2 L=受取 M=販売 N=希望 O=備考 P=転記 Q=配信停止
// レイアウト B (承認列なし、E〜が 1 列左にシフト):
//   D=電話 E=メール F=請求書先 G=郵便1 H=住所1 I=郵便2 J=住所2 K=受取 L=販売 M=希望 N=備考 O=転記 (?) Q=配信停止
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SkipEntry { title: string; reason: string }

function parseExcelRows(buf: Buffer): { rows: ShopRow[]; sheetUsed: string; preSkipped: SkipEntry[] } {
  const wb = XLSX.read(buf, { type: "buffer" });

  const preferredSheets = ["顧客マスター", "卸_ショップ登録フォーム"];
  const sheetName = preferredSheets.find((s) => wb.SheetNames.includes(s)) ?? wb.SheetNames[0]!;
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { rows: [], sheetUsed: sheetName, preSkipped: [] };

  const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: "A", raw: true, defval: null,
  });
  if (allRows.length === 0) return { rows: [], sheetUsed: sheetName, preSkipped: [] };

  // ヘッダ行 (1 行目) の妥当性チェック
  const header = allRows[0]!;
  const isCustomerMaster = String(header["D"] ?? "").includes("承認");
  const isRegistrationForm = String(header["A"] ?? "").includes("タイムスタンプ");
  if (!isCustomerMaster && !isRegistrationForm) {
    return { rows: [], sheetUsed: sheetName, preSkipped: [] };
  }

  const rows: ShopRow[] = [];
  const preSkipped: SkipEntry[] = [];

  for (let i = 1; i < allRows.length; i++) {
    const r = allRows[i]!;
    const company = String(r["B"] ?? "").trim();
    const contact = String(r["C"] ?? "").trim();
    if (!company || !contact) continue;

    // email 列を自動検出 (D / E / F のいずれか)
    let emailCol: "D" | "E" | "F" | null = null;
    for (const c of ["F", "E", "D"] as const) {
      const v = r[c];
      if (typeof v === "string" && EMAIL_RE.test(v.trim())) {
        emailCol = c;
        break;
      }
    }
    if (!emailCol) {
      preSkipped.push({ title: `${company} (${contact})`, reason: `行${i + 1}: 有効なメールアドレスが見つかりません` });
      continue;
    }

    // emailCol を基準に他の列を逆算
    // emailCol = F (レイアウト A): phone=E, 承認=D, 請求書先=G, 郵便1=H, 住所1=I, 郵便2=J, 住所2=K
    // emailCol = E (レイアウト B): phone=D, 承認=null, 請求書先=F, 郵便1=G, 住所1=H, 郵便2=I, 住所2=J
    // emailCol = D (irregular): phone=null, 承認=null, 郵便1=F, 住所1=G, 郵便2=H, 住所2=I
    let colPhone: string | null;
    let colApproved: string | null;
    let colPostal1: string;
    let colAddress1: string;
    let colPostal2: string;
    let colAddress2: string;

    if (emailCol === "F") {
      colPhone = "E"; colApproved = "D";
      colPostal1 = "H"; colAddress1 = "I"; colPostal2 = "J"; colAddress2 = "K";
    } else if (emailCol === "E") {
      colPhone = "D"; colApproved = null;
      colPostal1 = "G"; colAddress1 = "H"; colPostal2 = "I"; colAddress2 = "J";
    } else { // D
      colPhone = null; colApproved = null;
      colPostal1 = "F"; colAddress1 = "G"; colPostal2 = "H"; colAddress2 = "I";
    }

    const email = String(r[emailCol] ?? "").trim().toLowerCase();
    const postal1  = normalizePostal(r[colPostal1]);
    const address1 = String(r[colAddress1] ?? "").trim();
    const postal2  = normalizePostal(r[colPostal2]);
    const address2 = String(r[colAddress2] ?? "").trim();

    // status 判定: 配信停止 (Q列) → suspended, 承認済 (D列, レイアウトA のみ) → active
    let status: ShopStatus = "pending";
    if (asBool(r["Q"])) {
      status = "suspended";
    } else if (colApproved && asBool(r[colApproved])) {
      status = "active";
    }

    rows.push({
      company_name: company,
      contact_name: contact,
      email,
      phone: colPhone ? normalizePhone(r[colPhone]) : null,
      address: [postal1, address1].filter(Boolean).join(" ") || null,
      delivery_address: [postal2, address2].filter(Boolean).join(" ") || null,
      current_rank: "standard",
      status,
    });
  }

  return { rows, sheetUsed: sheetName, preSkipped };
}

// ============================================================
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

  const name = file.name.toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

  let rows: ShopRow[];
  let sheetUsed: string | null = null;
  let preSkipped: SkipEntry[] = [];
  try {
    if (isExcel) {
      const buf = Buffer.from(await file.arrayBuffer());
      const parsed = parseExcelRows(buf);
      rows = parsed.rows;
      sheetUsed = parsed.sheetUsed;
      preSkipped = parsed.preSkipped;
    } else {
      const text = await file.text();
      rows = parseCsvRows(text);
    }
  } catch (e) {
    return NextResponse.json(
      { error: `ファイル解析失敗: ${e instanceof Error ? e.message : "?"}` },
      { status: 400 },
    );
  }

  if (rows.length === 0 && preSkipped.length === 0) {
    return NextResponse.json(
      { error: "取込対象の行が見つかりませんでした。フォーマットを確認してください。", sheetUsed },
      { status: 400 },
    );
  }

  const inserted: string[] = [];
  const updated: { title: string; changes: string[] }[] = [];
  const skipped: SkipEntry[] = [...preSkipped];
  const errors: string[] = [];

  const adminSb = createAdminClient();
  const seenEmails = new Set<string>();

  // 既存 shops と Auth ユーザーをループ前に 1 回ずつ取得 (N+1 回避)
  const targetEmails = [...new Set(rows.map((r) => r.email))];
  const { data: existingShops } = await supabase
    .from("shops")
    .select("*")
    .in("email", targetEmails)
    .is("deleted_at", null);
  const existingShopMap = new Map((existingShops ?? []).map((s) => [s.email, s]));

  const { data: authList } = await adminSb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUserMap = new Map(
    (authList?.users ?? []).map((u) => [u.email?.toLowerCase() ?? "", u.id]),
  );

  for (const row of rows) {
    if (seenEmails.has(row.email)) {
      skipped.push({ title: `${row.company_name} (${row.email})`, reason: "同一ファイル内で email 重複" });
      continue;
    }
    seenEmails.add(row.email);

    const display = `${row.company_name} (${row.email})`;

    const existing = existingShopMap.get(row.email);

    if (existing) {
      const changes: string[] = [];
      if (existing.company_name !== row.company_name)
        changes.push(`会社名: ${existing.company_name} → ${row.company_name}`);
      if (existing.contact_name !== row.contact_name)
        changes.push(`担当: ${existing.contact_name} → ${row.contact_name}`);
      if ((existing.phone ?? "") !== (row.phone ?? ""))
        changes.push(`電話: ${existing.phone ?? "—"} → ${row.phone ?? "—"}`);
      if ((existing.address ?? "") !== (row.address ?? ""))
        changes.push("住所更新");
      if ((existing.delivery_address ?? "") !== (row.delivery_address ?? ""))
        changes.push("配送先更新");
      if (existing.status !== row.status)
        changes.push(`状態: ${existing.status} → ${row.status}`);

      const { error } = await supabase
        .from("shops")
        .update({
          company_name: row.company_name,
          contact_name: row.contact_name,
          phone: row.phone,
          address: row.address,
          delivery_address: row.delivery_address,
          status: row.status,
        })
        .eq("id", existing.id);
      if (error) errors.push(`${display}: ${error.message}`);
      else updated.push({ title: display, changes });
    } else {
      // 既に Auth ユーザーがあれば再利用、なければ作成
      let userId: string | null = authUserMap.get(row.email) ?? null;
      let createdNewAuth = false;
      if (!userId) {
        const { data: authData, error: authErr } = await adminSb.auth.admin.createUser({
          email: row.email,
          email_confirm: false,
          user_metadata: { role: "shop", company_name: row.company_name },
        });
        if (authErr) {
          errors.push(`${display}: Auth 失敗 ${authErr.message}`);
          continue;
        }
        userId = authData.user?.id ?? null;
        createdNewAuth = true;
        if (userId) authUserMap.set(row.email, userId);
      }
      if (!userId) {
        errors.push(`${display}: Auth user ID 取得失敗`);
        continue;
      }

      const { error } = await supabase.from("shops").insert({
        company_name: row.company_name,
        contact_name: row.contact_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        delivery_address: row.delivery_address,
        current_rank: row.current_rank,
        status: row.status,
        user_id: userId,
      });
      if (error) {
        // 新規 Auth を作った場合のみロールバック
        if (createdNewAuth) await adminSb.auth.admin.deleteUser(userId);
        errors.push(`${display}: ${error.message}`);
      } else {
        inserted.push(display);
      }
    }
  }

  return NextResponse.json({
    summary: {
      inserted: inserted.length,
      updated: updated.length,
      skipped: skipped.length,
      errors: errors.length,
    },
    sheetUsed,
    inserted,
    updated,
    skipped,
    errors,
  });
}
