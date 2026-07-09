// 返金先口座 の型・検証・整形 (サーバ/クライアント/PDF いずれからも import 可・zod非依存)
import type { Shop } from "@/types/database";

export type RefundAccountType = "普通" | "当座";

export type RefundAccount = {
  refund_bank_name: string;
  refund_bank_branch: string;
  refund_account_type: RefundAccountType;
  refund_account_number: string;
  refund_account_holder: string; // 口座名義(カナ)
};

const MAX = 60;

/** 未検証入力を検証して正規化。エラー時は理由を返す。 */
export function validateRefundAccount(
  input: unknown,
): { ok: true; value: RefundAccount } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) return { ok: false, error: "口座情報が入力されていません" };
  const o = input as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const bank = str(o.refund_bank_name);
  const branch = str(o.refund_bank_branch);
  const type = str(o.refund_account_type);
  const number = str(o.refund_account_number);
  const holder = str(o.refund_account_holder);

  if (!bank) return { ok: false, error: "銀行名を入力してください" };
  if (!branch) return { ok: false, error: "支店名を入力してください" };
  if (type !== "普通" && type !== "当座") return { ok: false, error: "口座種別は 普通/当座 から選んでください" };
  if (!/^\d{1,10}$/.test(number)) return { ok: false, error: "口座番号は数字のみ(最大10桁)で入力してください" };
  if (!holder) return { ok: false, error: "口座名義(カナ)を入力してください" };
  for (const [v, name] of [[bank, "銀行名"], [branch, "支店名"], [holder, "口座名義"]] as const) {
    if (v.length > MAX) return { ok: false, error: `${name}が長すぎます` };
  }
  return {
    ok: true,
    value: {
      refund_bank_name: bank,
      refund_bank_branch: branch,
      refund_account_type: type,
      refund_account_number: number,
      refund_account_holder: holder,
    },
  };
}

type ShopRefundCols = Pick<
  Shop,
  | "refund_bank_name"
  | "refund_bank_branch"
  | "refund_account_type"
  | "refund_account_number"
  | "refund_account_holder"
>;

/** shop 行から登録済み口座を取り出す(未登録は null)。 */
export function shopRefundAccount(shop: ShopRefundCols): RefundAccount | null {
  if (!shop.refund_bank_name || !shop.refund_account_number || !shop.refund_account_type) return null;
  return {
    refund_bank_name: shop.refund_bank_name,
    refund_bank_branch: shop.refund_bank_branch ?? "",
    refund_account_type: shop.refund_account_type,
    refund_account_number: shop.refund_account_number,
    refund_account_holder: shop.refund_account_holder ?? "",
  };
}

/** 支払通知書PDF等の3行表記 */
export function refundAccountLines(a: RefundAccount): { bank: string; account: string; holder: string } {
  return {
    bank: `銀行名 ／ 支店名：${a.refund_bank_name} ／ ${a.refund_bank_branch}`,
    account: `口座種別 ／ 口座番号：${a.refund_account_type} ／ ${a.refund_account_number}`,
    holder: `口座名義：${a.refund_account_holder}`,
  };
}

/** 一覧・通知向けの1行表記 */
export function refundAccountOneLine(a: RefundAccount): string {
  return `${a.refund_bank_name} ${a.refund_bank_branch} / ${a.refund_account_type} ${a.refund_account_number} / ${a.refund_account_holder}`;
}

/** JSON文字列(new_value)を安全にparseしてRefundAccountに(失敗時null) */
export function parseRefundAccountJson(s: string | null | undefined): RefundAccount | null {
  if (!s) return null;
  try {
    const r = validateRefundAccount(JSON.parse(s));
    return r.ok ? r.value : null;
  } catch {
    return null;
  }
}
