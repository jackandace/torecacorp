// 請求書 発行元・振込先などの固定情報 (株式会社パレットグループ)
// 名称・インボイス番号は環境変数で上書き可能。住所/振込先は固定。

export const ISSUER = {
  name: process.env.INVOICE_ISSUER_NAME ?? "株式会社パレットグループ",
  registrationNumber: process.env.INVOICE_REGISTRATION_NUMBER ?? "T8011001119787",
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
    "カ)アリイ",
  ],
  note: "※社名変更前の口座名義となります。",
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
