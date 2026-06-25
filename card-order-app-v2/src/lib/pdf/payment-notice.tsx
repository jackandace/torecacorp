// 支払通知書 PDF (返金のご案内)
//
// 返金請求 (invoice_kind='refund') に対して発行する。
// 保証金(前受金)が確定満額を上回った差額を、当社からショップへ返金する旨を通知する。
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Invoice, Shop } from "@/types/database";
import { registerJpFont, JP_FONT_FAMILY } from "./fonts";

registerJpFont();

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: JP_FONT_FAMILY },
  title: { fontSize: 22, marginBottom: 6, textAlign: "center", fontWeight: 700 },
  subtitle: { fontSize: 10, marginBottom: 18, textAlign: "center", color: "#555" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  amountBox: {
    border: "1pt solid #111",
    padding: 14,
    marginTop: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  amountLabel: { fontSize: 11, marginBottom: 4 },
  amount: { fontSize: 24, fontWeight: 700 },
  bodyText: { marginTop: 10, lineHeight: 1.6 },
  breakdown: { marginTop: 14, borderTop: "1pt solid #ccc", paddingTop: 8 },
  bdRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  bankBox: { marginTop: 20, border: "1pt solid #999", padding: 12 },
  bankLine: { borderBottom: "1pt solid #ddd", paddingVertical: 6 },
  footer: { marginTop: 28, fontSize: 9, color: "#444" },
});

export interface PaymentNoticePdfProps {
  invoice: Invoice;     // refund 請求書
  shop: Shop;
  issuedAt: string;     // YYYY-MM-DD
  finalTotal: number;   // 確定満額(税込)
  issuer: { name: string; registrationNumber: string };
}

export function PaymentNoticePdf({ invoice, shop, issuedAt, finalTotal, issuer }: PaymentNoticePdfProps) {
  const refundAmount = invoice.total_amount; // 返金額(正の額)
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>支 払 通 知 書</Text>
        <Text style={styles.subtitle}>（返金のご案内）</Text>

        <View style={styles.metaRow}>
          <Text>{shop.company_name} 御中</Text>
          <Text>発行日: {issuedAt}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text>通知番号: {invoice.invoice_number}</Text>
          <Text></Text>
        </View>

        <Text style={styles.bodyText}>
          配分確定の結果、お預かりしておりました保証金(前受金)が確定金額を上回りましたので、
          下記のとおり差額を返金いたします。
        </Text>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>返金額 (税込)</Text>
          <Text style={styles.amount}>¥{refundAmount.toLocaleString()} -</Text>
        </View>

        <View style={styles.breakdown}>
          <View style={styles.bdRow}>
            <Text>確定金額 (税込)</Text>
            <Text>¥{finalTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.bdRow}>
            <Text>お預かり保証金 (前受金)</Text>
            <Text>¥{invoice.deposit_applied.toLocaleString()}</Text>
          </View>
          <View style={styles.bdRow}>
            <Text>返金額</Text>
            <Text>¥{refundAmount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.bankBox}>
          <Text style={{ marginBottom: 8 }}>お振込先をご記入のうえ、ご返信ください。</Text>
          <Text style={styles.bankLine}>金融機関名 / 支店名：</Text>
          <Text style={styles.bankLine}>口座種別 / 口座番号：</Text>
          <Text style={styles.bankLine}>口座名義：</Text>
        </View>

        <View style={styles.footer}>
          <Text>{issuer.name}</Text>
          <Text>登録番号: {issuer.registrationNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
