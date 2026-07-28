// 請求書 PDF (React-PDF) — 株式会社パレットグループ 体裁
//
// 種別 (invoice_kind):
//   normal  … 通常請求
//   deposit … 保証金(前受金・税なし)
//   final   … 最終精算(差額・前受金控除)
// 消費税は外税表示 (小計/リベート/手数料/課税対象/消費税/合計)。
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Invoice, Shop } from "@/types/database";
import { inferDepositRate } from "@/lib/deposit";
import { registerJpFont, JP_FONT_FAMILY } from "./fonts";
import { ISSUER, BANK, INVOICE_FOOTER_NOTE, invoiceSubject, HAS_SEAL, SEAL_PATH } from "./issuer";

registerJpFont();

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: JP_FONT_FAMILY, color: "#111" },
  title: { fontSize: 20, marginBottom: 14, textAlign: "center", letterSpacing: 6 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  custName: { fontSize: 12, borderBottom: "1pt solid #333", paddingBottom: 2, minWidth: 220 },
  dateBox: { alignItems: "flex-end" },
  subjectRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, alignItems: "flex-start" },
  subject: { fontSize: 12, fontWeight: 700, borderBottom: "1pt solid #333", paddingBottom: 3 },
  issuer: { fontSize: 8.5, lineHeight: 1.5, textAlign: "left", position: "relative" },
  issuerName: { fontSize: 11, marginBottom: 2 },
  seal: { position: "absolute", top: -6, right: 4, width: 52, height: 52 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, borderBottom: "1.5pt solid #333", borderTop: "1.5pt solid #333", paddingVertical: 6 },
  grandLabel: { fontSize: 12 },
  grandValue: { fontSize: 15, fontWeight: 700 },
  table: { marginTop: 14, borderTop: "1pt solid #666" },
  th: { flexDirection: "row", backgroundColor: "#eef2f7", borderBottom: "1pt solid #666" },
  td: { flexDirection: "row", borderBottom: "1pt solid #e2e8f0", minHeight: 18 },
  cNo: { width: 26, padding: 4, textAlign: "center" },
  cDesc: { flex: 1, padding: 4 },
  cQty: { width: 60, padding: 4, textAlign: "center" },
  cUnit: { width: 70, padding: 4, textAlign: "right" },
  cAmt: { width: 80, padding: 4, textAlign: "right" },
  totals: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  totalsBox: { width: 260 },
  tRow: { flexDirection: "row", borderBottom: "1pt solid #e2e8f0" },
  tLabel: { width: 120, padding: 4, backgroundColor: "#eef2f7", textAlign: "center" },
  tVal: { flex: 1, padding: 4, textAlign: "right" },
  bank: { marginTop: 16 },
  bankTitle: { marginBottom: 3 },
  redNote: { color: "#c00", fontSize: 8 },
  remarksBox: { flexDirection: "row", marginTop: 14, border: "1pt solid #999" },
  remarksLabel: { width: 60, padding: 6, backgroundColor: "#eef2f7", textAlign: "center" },
  remarksBody: { flex: 1, padding: 6, fontSize: 8.5 },
  calcNote: { marginTop: 10, fontSize: 7.5, color: "#667085", lineHeight: 1.5 },
});

export interface InvoicePdfItem {
  title: string;
  modelNumber?: string | null;
  qty: number;
  rate?: number;        // 掛け率 (0.88 等)
  unitPrice: number;    // 案内単価 (税抜)
  lineAmount: number;   // 明細金額 (税抜)
  baseAmount?: number;  // 保証金の元金 (税抜満額。deposit のみ)
}

export interface InvoicePdfProps {
  invoice: Invoice;
  shop: Shop;
  items: InvoicePdfItem[];
  issuer: { name: string; registrationNumber: string };
}

function jpDate(iso: string): { ymd: string; jp: string } {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  return { ymd: `${y}${m}${day}`, jp: `${y}年${Number(m)}月${Number(day)}日` };
}

export function InvoicePdf({ invoice, shop, items }: InvoicePdfProps) {
  const kind = invoice.invoice_kind;
  const isDeposit = kind === "deposit";
  const isFinal = kind === "final";
  const grossTotal = invoice.taxable_amount + invoice.tax_amount; // 確定金額(税込)
  const issued = jpDate(invoice.issued_at);
  const due = invoice.due_date ? jpDate(invoice.due_date).jp : "—";
  // 保証金の適用率と元金(税抜満額)。deposit_rate 未保存の過去請求書は金額から推定
  const depositBase = items.reduce((s, it) => s + (it.baseAmount ?? 0), 0);
  const depositRate = isDeposit
    ? invoice.deposit_rate ?? inferDepositRate(invoice.total_amount, depositBase)
    : null;
  const depositPct = depositRate != null ? `${Math.round(depositRate * 100)}%` : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>請 求 書</Text>

        {/* 宛先 + 日付 */}
        <View style={styles.topRow}>
          <Text style={styles.custName}>{shop.company_name}　御中</Text>
          <View style={styles.dateBox}>
            <Text>{issued.ymd}</Text>
            <Text>{issued.jp}</Text>
          </View>
        </View>

        {/* 件名 + 発行元 */}
        <View style={styles.subjectRow}>
          <View>
            <Text style={styles.subject}>件名： {invoiceSubject(kind)}</Text>
            <Text style={{ marginTop: 6 }}>下記の通り、ご請求申し上げます。</Text>
          </View>
          <View style={styles.issuer}>
            {HAS_SEAL && <Image src={SEAL_PATH} style={styles.seal} />}
            <Text style={styles.issuerName}>{ISSUER.name}</Text>
            <Text>{ISSUER.address1}</Text>
            <Text>{ISSUER.address2}</Text>
            <Text>TEL：{ISSUER.tel}</Text>
            <Text>E-Mail：{ISSUER.email}</Text>
            <Text>インボイス登録番号：{ISSUER.registrationNumber}</Text>
          </View>
        </View>

        {/* 合計金額 */}
        <View style={styles.grandRow}>
          <Text style={styles.grandLabel}>
            合計金額　<Text style={styles.grandValue}>¥{invoice.total_amount.toLocaleString()}</Text>　（税込）
          </Text>
          <Text>お支払期限：　{due}</Text>
        </View>

        {/* 明細 */}
        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cNo}>No.</Text>
            <Text style={styles.cDesc}>摘要</Text>
            <Text style={styles.cQty}>数量</Text>
            <Text style={styles.cUnit}>単価</Text>
            <Text style={styles.cAmt}>金額</Text>
          </View>
          {items.map((it, i) => (
            <View key={i} style={styles.td}>
              <Text style={styles.cNo}>{i + 1}</Text>
              <Text style={styles.cDesc}>
                {it.title}
                {it.modelNumber ? `　${it.modelNumber}` : ""}
                {it.rate ? `　掛け率${Math.round(it.rate * 100)}%` : ""}
                {isDeposit ? `　保証金${depositPct ?? ""}分` : isFinal ? "　差額分" : ""}
              </Text>
              <Text style={styles.cQty}>{it.qty} BOX</Text>
              <Text style={styles.cUnit}>¥{it.unitPrice.toLocaleString()}</Text>
              <Text style={styles.cAmt}>¥{it.lineAmount.toLocaleString()}</Text>
            </View>
          ))}
          {invoice.fee_amount > 0 && (
            <View style={styles.td}>
              <Text style={styles.cNo}>{items.length + 1}</Text>
              <Text style={styles.cDesc}>手数料（決済手数料 2%）</Text>
              <Text style={styles.cQty}>1 式</Text>
              <Text style={styles.cUnit}></Text>
              <Text style={styles.cAmt}>¥{invoice.fee_amount.toLocaleString()}</Text>
            </View>
          )}
        </View>

        {/* 金額内訳 */}
        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            {isDeposit ? (
              <>
                {depositBase > 0 && (
                  <View style={styles.tRow}>
                    <Text style={styles.tLabel}>対象金額（税抜）</Text>
                    <Text style={styles.tVal}>¥{depositBase.toLocaleString()}</Text>
                  </View>
                )}
                {depositPct && (
                  <View style={styles.tRow}>
                    <Text style={styles.tLabel}>保証金率</Text>
                    <Text style={styles.tVal}>{depositPct}</Text>
                  </View>
                )}
                <View style={styles.tRow}>
                  <Text style={styles.tLabel}>保証金（前受金）</Text>
                  <Text style={styles.tVal}>¥{invoice.total_amount.toLocaleString()}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.tRow}>
                  <Text style={styles.tLabel}>小計</Text>
                  <Text style={styles.tVal}>¥{invoice.subtotal.toLocaleString()}</Text>
                </View>
                {invoice.rebate_amount > 0 && (
                  <View style={styles.tRow}>
                    <Text style={styles.tLabel}>リベート</Text>
                    <Text style={styles.tVal}>-¥{invoice.rebate_amount.toLocaleString()}</Text>
                  </View>
                )}
                {invoice.fee_amount > 0 && (
                  <View style={styles.tRow}>
                    <Text style={styles.tLabel}>手数料</Text>
                    <Text style={styles.tVal}>¥{invoice.fee_amount.toLocaleString()}</Text>
                  </View>
                )}
                <View style={styles.tRow}>
                  <Text style={styles.tLabel}>課税対象額</Text>
                  <Text style={styles.tVal}>¥{invoice.taxable_amount.toLocaleString()}</Text>
                </View>
                <View style={styles.tRow}>
                  <Text style={styles.tLabel}>消費税</Text>
                  <Text style={styles.tVal}>¥{invoice.tax_amount.toLocaleString()}</Text>
                </View>
                {isFinal ? (
                  <>
                    <View style={styles.tRow}>
                      <Text style={styles.tLabel}>確定金額（税込）</Text>
                      <Text style={styles.tVal}>¥{grossTotal.toLocaleString()}</Text>
                    </View>
                    <View style={styles.tRow}>
                      <Text style={styles.tLabel}>前受金充当</Text>
                      <Text style={styles.tVal}>-¥{invoice.deposit_applied.toLocaleString()}</Text>
                    </View>
                    <View style={styles.tRow}>
                      <Text style={styles.tLabel}>今回ご請求額</Text>
                      <Text style={styles.tVal}>¥{invoice.total_amount.toLocaleString()}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.tRow}>
                    <Text style={styles.tLabel}>合計</Text>
                    <Text style={styles.tVal}>¥{invoice.total_amount.toLocaleString()}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* お振込先 */}
        <View style={styles.bank}>
          <Text style={styles.bankTitle}>お振込先</Text>
          {BANK.lines.map((l, i) => <Text key={i}>{l}</Text>)}
          {BANK.note ? <Text style={styles.redNote}>{BANK.note}</Text> : null}
        </View>

        {/* 備考 */}
        <View style={styles.remarksBox}>
          <Text style={styles.remarksLabel}>備考</Text>
          <Text style={styles.remarksBody}>{INVOICE_FOOTER_NOTE}</Text>
        </View>

        {/* 計算方法の注記 (お客様向け) */}
        <Text style={styles.calcNote}>
          {isDeposit
            ? `※ 本請求はカット対象商品の保証金（前受金）です。金額は「定価 × 希望数量 × 案内掛け率 × ${depositPct ?? "保証金率"}」で算出しています。メーカーからの提供数量が確定次第、最終金額を精算し、差額のご請求（お預かりが上回った場合は返金）を行います。`
            : "※ ご請求額は「定価 × 数量 × 案内掛け率 − リベート（ランク割引）＋ 決済手数料（税抜2%）＋ 消費税10%」で算出しています。" +
              (isFinal ? "本請求は数量確定後の最終精算で、お預かりの保証金（前受金）を充当した差額分です。" : "")}
        </Text>
      </Page>
    </Document>
  );
}
