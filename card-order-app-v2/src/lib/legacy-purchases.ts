// 卸アプリ運用以前の購入履歴 (legacy_purchases) の共通定義・取込パーサ
//
// テンプレート生成 (api/legacy-purchases/template) と一括取込
// (api/shops/[id]/legacy-purchases/import) が同じ列定義を使うため、
// テンプレと取込の列がずれることはない。取込は「テンプレの見出しと完全一致」を
// 必須にし、1行でもエラーがあれば登録させない (データのブレで崩さないため)。
import type { LegacyPurchaseShipmentStatus } from "@/types/database";

/** テンプレートの列 (この順・この見出しで固定) */
export const LEGACY_TEMPLATE_COLUMNS = [
  { key: "purchasedOn",  header: "購入日",             required: true,  example: "2025/03/15",  help: "YYYY/MM/DD 形式" },
  { key: "productName",  header: "商品名",             required: true,  example: "ポケモンカードゲーム 拡張パック 〇〇", help: "自由入力" },
  { key: "quantity",     header: "数量",               required: true,  example: 10,            help: "1以上の整数" },
  { key: "unit",         header: "単位",               required: false, example: "BOX",         help: "BOX / CT / パック / 個 / セット (空欄は BOX)" },
  { key: "unitPrice",    header: "単価(税抜)",         required: true,  example: 4800,          help: "円・整数 (カンマ可)" },
  { key: "amount",       header: "金額(税抜)",         required: false, example: 48000,         help: "空欄なら 数量×単価 を自動計算" },
  { key: "shipment",     header: "出荷状況",           required: true,  example: "出荷済",      help: "出荷済 / 未出荷" },
  { key: "note",         header: "備考(お客様に表示)", required: false, example: "",            help: "お客様のマイページにも表示されます" },
  { key: "internalNote", header: "社内メモ(非表示)",   required: false, example: "",            help: "社内のみ。お客様には表示されません" },
] as const;

export const LEGACY_DATA_SHEET = "購入履歴";
export const LEGACY_UNITS = ["BOX", "CT", "パック", "個", "セット"] as const;
export const LEGACY_MAX_ROWS = 1000;

export const SHIPMENT_LABEL: Record<LegacyPurchaseShipmentStatus, string> = {
  shipped: "出荷済",
  unshipped: "未出荷",
};

export interface LegacyPurchaseInput {
  purchasedOn: string;       // YYYY-MM-DD
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  shipmentStatus: LegacyPurchaseShipmentStatus;
  note: string | null;
  internalNote: string | null;
}

export interface ParsedLegacyRow {
  row: number;               // Excel 上の行番号 (見出し=1行目)
  data: LegacyPurchaseInput | null;
  errors: string[];
  warnings: string[];
}

const str = (v: unknown): string => (v == null ? "" : String(v).trim());

/** 購入日: Excel シリアル値 / Date / "YYYY/MM/DD" / "YYYY-MM-DD" のみ受け付ける */
export function parseLegacyDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  let y: number, m: number, d: number;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    y = v.getFullYear(); m = v.getMonth() + 1; d = v.getDate();
  } else if (typeof v === "number") {
    const dt = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (Number.isNaN(dt.getTime())) return null;
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else {
    const mt = String(v).trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (!mt) return null;
    y = +mt[1]!; m = +mt[2]!; d = +mt[3]!;
  }
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 整数: 数値 or "1,234" / "¥1,234" / "1234円" のみ (単位混じり "12box" は不可) */
export function parseLegacyInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isInteger(v) ? v : null;
  const s = String(v).trim().replace(/^[¥￥]/, "").replace(/円$/, "").replace(/,/g, "");
  return /^\d+$/.test(s) ? parseInt(s, 10) : null;
}

export function parseShipmentStatus(v: unknown): LegacyPurchaseShipmentStatus | null {
  const s = str(v);
  if (s === "出荷済" || s === "出荷済み") return "shipped";
  if (s === "未出荷") return "unshipped";
  return null;
}

/** 見出し行がテンプレと完全一致するか。不一致の列を返す (空配列なら OK) */
export function checkTemplateHeader(headerRow: unknown[]): string[] {
  const problems: string[] = [];
  LEGACY_TEMPLATE_COLUMNS.forEach((col, i) => {
    const got = str(headerRow[i]).replace(/[*＊]/g, "");
    if (got !== col.header) {
      problems.push(`${String.fromCharCode(65 + i)}列: 「${col.header}」のはずが「${got || "(空)"}」`);
    }
  });
  return problems;
}

/** 購入日が未来でないか・極端に古くないか (取込・手入力の共通チェック) */
export function purchasedOnProblem(date: string, today: string): string | null {
  if (date > today) return "購入日が未来の日付です";
  if (date < "2000-01-01") return "購入日が古すぎます (2000年以降)";
  return null;
}

/** 1行分の検証。values は見出しを除いた行 (A列〜) */
export function parseLegacyRow(values: unknown[], rowNumber: number, today: string): ParsedLegacyRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const [rawDate, rawName, rawQty, rawUnit, rawPrice, rawAmount, rawShip, rawNote, rawMemo] = values;

  const purchasedOn = parseLegacyDate(rawDate);
  if (!purchasedOn) errors.push(`購入日「${str(rawDate) || "(空)"}」を読めません (YYYY/MM/DD)`);
  else {
    const p = purchasedOnProblem(purchasedOn, today);
    if (p) errors.push(p);
  }

  const productName = str(rawName);
  if (!productName) errors.push("商品名が空です");
  else if (productName.length > 200) errors.push("商品名が長すぎます (200文字まで)");

  const quantity = parseLegacyInt(rawQty);
  if (quantity == null || quantity <= 0) errors.push(`数量「${str(rawQty) || "(空)"}」は1以上の整数で入力してください`);

  const unit = str(rawUnit) || "BOX";
  if (!(LEGACY_UNITS as readonly string[]).includes(unit)) {
    errors.push(`単位「${unit}」は ${LEGACY_UNITS.join(" / ")} のいずれかにしてください`);
  }

  const unitPrice = parseLegacyInt(rawPrice);
  if (unitPrice == null) errors.push(`単価「${str(rawPrice) || "(空)"}」を読めません (税抜の整数)`);

  let amount: number | null = null;
  if (str(rawAmount) === "") {
    if (quantity != null && unitPrice != null) amount = quantity * unitPrice;
  } else {
    amount = parseLegacyInt(rawAmount);
    if (amount == null) errors.push(`金額「${str(rawAmount)}」を読めません (税抜の整数)`);
    else if (quantity != null && unitPrice != null && amount !== quantity * unitPrice) {
      warnings.push(`金額 ¥${amount.toLocaleString()} が 数量×単価 (¥${(quantity * unitPrice).toLocaleString()}) と一致しません (値引き等なら問題なし)`);
    }
  }

  const shipmentStatus = parseShipmentStatus(rawShip);
  if (!shipmentStatus) errors.push(`出荷状況「${str(rawShip) || "(空)"}」は 出荷済 / 未出荷 のどちらかにしてください`);

  const note = str(rawNote) || null;
  const internalNote = str(rawMemo) || null;

  const ok = errors.length === 0 && purchasedOn && quantity != null && unitPrice != null && amount != null && shipmentStatus;
  return {
    row: rowNumber,
    data: ok
      ? { purchasedOn: purchasedOn!, productName, quantity: quantity!, unit, unitPrice: unitPrice!, amount: amount!, shipmentStatus: shipmentStatus!, note, internalNote }
      : null,
    errors,
    warnings,
  };
}

/** 重複判定キー (購入日・商品名・数量・金額が同じなら同一とみなす) */
export function legacyDupKey(r: { purchasedOn: string; productName: string; quantity: number; amount: number }): string {
  return [r.purchasedOn, r.productName.replace(/\s+/g, ""), r.quantity, r.amount].join("|");
}

/**
 * シートの2次元配列 (1行目=見出し) を検証する。
 * 空行は読み飛ばす。見出し不一致なら headerProblems を返し行は解釈しない。
 */
export function parseLegacySheet(
  matrix: unknown[][],
  today: string,
): { headerProblems: string[]; rows: ParsedLegacyRow[]; tooMany: boolean } {
  const headerProblems = checkTemplateHeader(matrix[0] ?? []);
  if (headerProblems.length > 0) return { headerProblems, rows: [], tooMany: false };

  const rows: ParsedLegacyRow[] = [];
  const seen = new Map<string, number>();
  for (let i = 1; i < matrix.length; i++) {
    const values = (matrix[i] ?? []).slice(0, LEGACY_TEMPLATE_COLUMNS.length);
    if (values.every((v) => str(v) === "")) continue;
    const parsed = parseLegacyRow(values, i + 1, today);
    if (parsed.data) {
      const key = legacyDupKey(parsed.data);
      const first = seen.get(key);
      if (first) parsed.warnings.push(`${first}行目と同じ内容です (二重入力の可能性)`);
      else seen.set(key, parsed.row);
    }
    rows.push(parsed);
  }
  return { headerProblems, rows, tooMany: rows.length > LEGACY_MAX_ROWS };
}
