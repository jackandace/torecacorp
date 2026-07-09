// 請求書 発行元・振込先などの固定情報 (株式会社パレットグループ)
// 名称・登録番号・住所・振込先はすべて固定値(単一の出所)。
// 過去に環境変数へ残った別値/ダミーが本番へ反映される事故があったため、上書きは廃止。
import fs from "node:fs";
import path from "node:path";

// 電子印(角印) — src/lib/pdf/assets/company-seal.png があれば発行元に重ねて表示。
// 透過PNG・正方形推奨。ファイルが無ければ印なしでレンダリング(エラーにしない)。
export const SEAL_PATH = path.join(process.cwd(), "src/lib/pdf/assets/company-seal.png");
export const HAS_SEAL = (() => { try { return fs.existsSync(SEAL_PATH); } catch { return false; } })();

export const ISSUER = {
  // 署名欄の名称は固定(過去に環境変数の別値が本番へ残り不整合を招いたため上書きは廃止)
  name: "株式会社パレットグループ トレカ商事カンパニー",
  // 適格請求書発行事業者 登録番号(T+法人番号13桁)。固定値(環境変数のダミーで上書きされる事故を防ぐため直書き)。
  registrationNumber: "T8011001119787",
  address1: "東京都千代田区神田鍛冶町3丁目3番地1",
  address2: "神田ノースフロント 8F",
  tel: "03-4405-4584",
  email: "info@palettegroup.co.jp",
};

export const BANK = {
  lines: [
    "GMOあおぞらネット銀行(0310)",
    "法人第二営業部支店(102)",
    "普通: 1673852",
    "カ)パレットグループ",
  ],
  note: "",
};

export const INVOICE_FOOTER_NOTE =
  "恐れ入りますが、振込手数料は貴社にてご負担いただきますようお願い申し上げます。";

/** 請求種別 → 件名 */
export function invoiceSubject(kind: "normal" | "deposit" | "final" | "refund"): string {
  switch (kind) {
    case "deposit": return "カード購入代金(保証金分)";
    case "final":   return "カード購入代金(差額分)";
    case "refund":  return "カード購入代金(返金)";
    default:        return "カード購入代金";
  }
}
