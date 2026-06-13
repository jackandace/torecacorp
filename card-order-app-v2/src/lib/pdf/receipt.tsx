// 領収書 PDF
//
// 入金済み (status='入金済み') の請求書に対して発行する。
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Invoice, Shop } from "@/types/database";
import { registerJpFont, JP_FONT_FAMILY } from "./fonts";

registerJpFont();

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: JP_FONT_FAMILY },
  title: { fontSize: 22, marginBottom: 18, textAlign: "center", fontWeight: 700 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  amountBox: {
    border: "1pt solid #111",
    padding: 14,
    marginTop: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  amount: { fontSize: 24, fontWeight: 700 },
  bodyText: { marginTop: 10, lineHeight: 1.6 },
  footer: { marginTop: 32, fontSize: 9, color: "#444" },
  stampBox: {
    marginTop: 20,
    alignSelf: "flex-end",
    width: 80,
    height: 80,
    border: "1.5pt solid #c00",
    alignItems: "center",
    justifyContent: "center",
  },
});

export interface ReceiptPdfProps {
  invoice: Invoice;
  shop: Shop;
  paidAt: string;
  receivedFor: string;
  issuer: { name: string; registrationNumber: string };
}

export function ReceiptPdf({ invoice, shop, paidAt, receivedFor, issuer }: ReceiptPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>領 収 書</Text>

        <View style={styles.metaRow}>
          <Text>{shop.company_name} 御中</Text>
          <Text>発行日: {paidAt}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text>請求書番号: {invoice.invoice_number}</Text>
          <Text></Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amount}>¥{invoice.total_amount.toLocaleString()} -</Text>
          <Text>(税込)</Text>
        </View>

        <Text style={styles.bodyText}>
          但し: {receivedFor}
        </Text>
        <Text style={styles.bodyText}>
          上記正に領収いたしました。
        </Text>

        <View style={styles.stampBox}>
          <Text style={{ color: "#c00", fontSize: 12 }}>領 収 印</Text>
        </View>

        <View style={styles.footer}>
          <Text>{issuer.name}</Text>
          <Text>登録番号: {issuer.registrationNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
