// 支払通知書 PDF (返金のご案内) — 株式会社パレットグループ 体裁
//
// 返金請求 (invoice_kind='refund') に対して発行。請求書と同レイアウトで、
// 「指定口座にお振り込み」欄(お客様が記入)+ 電子印。
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { Invoice, Shop } from "@/types/database";
import { registerJpFont, JP_FONT_FAMILY } from "./fonts";
import { ISSUER, INVOICE_FOOTER_NOTE, HAS_SEAL, SEAL_PATH } from "./issuer";
import { shopRefundAccount, refundAccountLines } from "@/lib/refund-account";

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
  bankTitle: { marginBottom: 6 },
  bankLine: { borderBottom: "1pt solid #bbb", paddingVertical: 6, marginBottom: 2 },
  remarksBox: { flexDirection: "row", marginTop: 16, border: "1pt solid #999", minHeight: 44 },
  remarksLabel: { width: 60, padding: 6, backgroundColor: "#eef2f7", textAlign: "center" },
  remarksBody: { flex: 1, padding: 6, fontSize: 8.5 },
});

export interface PaymentNoticePdfProps {
  invoice: Invoice;         // refund 請求書
  shop: Shop;
  issuedAt: string;         // YYYY-MM-DD
  productNames: string;     // 対象商品名 (カンマ区切り)
  issuer: { name: string; registrationNumber: string };
}

function jpDate(iso: string): { ymd: string; jp: string } {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  return { ymd: `${y}${m}${day}`, jp: `${y}年${Number(m)}月${Number(day)}日` };
}

export function PaymentNoticePdf({ invoice, shop, issuedAt, productNames }: PaymentNoticePdfProps) {
  const refund = invoice.total_amount; // 返金額
  const d = jpDate(issuedAt);
  const desc = `${productNames || "カード卸"} 差額返金分`;
  // 事前登録の返金先口座があれば自動記載、無ければ記入欄
  const acc = shopRefundAccount(shop);
  const accLines = acc ? refundAccountLines(acc) : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>支 払 通 知 書</Text>

        <View style={styles.topRow}>
          <Text style={styles.custName}>{shop.company_name}　御中</Text>
          <View style={styles.dateBox}>
            <Text>支払通知書No.　{d.ymd}</Text>
            <Text>通知日　{d.jp}</Text>
          </View>
        </View>

        <View style={styles.subjectRow}>
          <View>
            <Text style={styles.subject}>件名： カード卸 差額返金分</Text>
            <Text style={{ marginTop: 6 }}>下記の通り、返金のご案内を申し上げます。</Text>
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

        <View style={styles.grandRow}>
          <Text style={styles.grandLabel}>
            合計金額　<Text style={styles.grandValue}>¥{refund.toLocaleString()}</Text>　（税込）
          </Text>
          <Text>支払予定日：　{d.jp}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cNo}>No.</Text>
            <Text style={styles.cDesc}>摘要</Text>
            <Text style={styles.cQty}>数量</Text>
            <Text style={styles.cUnit}>単価</Text>
            <Text style={styles.cAmt}>金額</Text>
          </View>
          <View style={styles.td}>
            <Text style={styles.cNo}>1</Text>
            <Text style={styles.cDesc}>{desc}</Text>
            <Text style={styles.cQty}>1 式</Text>
            <Text style={styles.cUnit}>¥{refund.toLocaleString()}</Text>
            <Text style={styles.cAmt}>¥{refund.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            <View style={styles.tRow}><Text style={styles.tLabel}>小計</Text><Text style={styles.tVal}>¥{refund.toLocaleString()}</Text></View>
            <View style={styles.tRow}><Text style={styles.tLabel}>消費税</Text><Text style={styles.tVal}>-</Text></View>
            <View style={styles.tRow}><Text style={styles.tLabel}>合計</Text><Text style={styles.tVal}>¥{refund.toLocaleString()}</Text></View>
          </View>
        </View>

        {/* 指定口座: 事前登録があれば自動記載、無ければ記入欄 */}
        <View style={styles.bank}>
          {accLines ? (
            <>
              <Text style={styles.bankTitle}>下記のご登録口座にお振り込みいたします。</Text>
              <Text style={styles.bankLine}>{accLines.bank}</Text>
              <Text style={styles.bankLine}>{accLines.account}</Text>
              <Text style={styles.bankLine}>{accLines.holder}</Text>
            </>
          ) : (
            <>
              <Text style={styles.bankTitle}>指定口座にお振り込みいたします。下記をご記入のうえご返信ください。</Text>
              <Text style={styles.bankLine}>銀行名 ／ 支店名：</Text>
              <Text style={styles.bankLine}>口座種別 ／ 口座番号：</Text>
              <Text style={styles.bankLine}>口座名義：</Text>
            </>
          )}
        </View>

        <View style={styles.remarksBox}>
          <Text style={styles.remarksLabel}>備考</Text>
          <Text style={styles.remarksBody}>{INVOICE_FOOTER_NOTE}</Text>
        </View>
      </Page>
    </Document>
  );
}
