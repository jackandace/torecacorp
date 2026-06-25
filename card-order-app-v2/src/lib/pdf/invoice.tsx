// 請求書 PDF (React-PDF)
//
// 必須記載項目:
//   請求書番号 / 発行日 / 支払期限
//   請求先 (会社名・住所)
//   商品明細 (商品名・型番・数量・単価・小計)
//   案内掛け率での小計 / リベート / 課税対象額 / 消費税 / 合計
//   発行元 (INVOICE_ISSUER_NAME) と インボイス登録番号
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Invoice, Shop } from "@/types/database";
import { registerJpFont, JP_FONT_FAMILY } from "./fonts";

registerJpFont();

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: JP_FONT_FAMILY },
  title: { fontSize: 18, marginBottom: 16, textAlign: "center", fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  meta: { marginBottom: 12 },
  table: { width: "100%", marginTop: 12, borderTop: "1pt solid #999" },
  th: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 6, fontWeight: 700, borderBottom: "1pt solid #999" },
  td: { flexDirection: "row", padding: 6, borderBottom: "1pt solid #eee" },
  c1: { flex: 4 },
  c2: { flex: 1, textAlign: "right" },
  c3: { flex: 1, textAlign: "right" },
  c4: { flex: 1, textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: 4 },
  grand: { borderTop: "1pt solid #000", marginTop: 4, paddingTop: 4, fontWeight: 700 },
  footer: { marginTop: 24, fontSize: 9, color: "#444" },
});

export interface InvoicePdfProps {
  invoice: Invoice;
  shop: Shop;
  items: Array<{
    title: string;
    modelNumber?: string | null;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  issuer: {
    name: string;
    registrationNumber: string;
  };
}

export function InvoicePdf({ invoice, shop, items, issuer }: InvoicePdfProps) {
  const kind = invoice.invoice_kind;
  const title = kind === "deposit" ? "保証金請求書" : kind === "final" ? "御請求書（最終精算）" : "請 求 書";
  // 確定数量に対する満額(税込)。final で前受金控除前の総額として表示
  const grossTotal = invoice.taxable_amount + invoice.tax_amount;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {kind === "deposit" && (
          <Text style={{ textAlign: "center", fontSize: 9, color: "#555", marginTop: -10, marginBottom: 12 }}>
            （前受金・配分確定後に最終精算いたします）
          </Text>
        )}

        <View style={styles.meta}>
          <View style={styles.row}>
            <Text>請求書番号: {invoice.invoice_number}</Text>
            <Text>発行日: {invoice.issued_at.slice(0, 10)}</Text>
          </View>
          <View style={styles.row}>
            <Text>{shop.company_name} 御中</Text>
            <Text>支払期限: {invoice.due_date ?? "—"}</Text>
          </View>
          {shop.address && <Text>{shop.address}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.c1}>品目</Text>
            <Text style={styles.c2}>数量</Text>
            <Text style={styles.c3}>単価</Text>
            <Text style={styles.c4}>金額</Text>
          </View>
          {items.map((it, idx) => (
            <View key={idx} style={styles.td}>
              <Text style={styles.c1}>
                {it.title}
                {it.modelNumber ? ` (${it.modelNumber})` : ""}
              </Text>
              <Text style={styles.c2}>{it.qty}</Text>
              <Text style={styles.c3}>¥{it.unitPrice.toLocaleString()}</Text>
              <Text style={styles.c4}>¥{it.lineTotal.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {kind === "deposit" ? (
          <View style={styles.totals}>
            <View style={[styles.totalRow, styles.grand]}>
              <Text>保証金額 (前受金)</Text>
              <Text>¥{invoice.total_amount.toLocaleString()}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>小計 (案内掛け率)</Text>
              <Text>¥{invoice.subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>リベート ({(invoice.rebate_rate * 100).toFixed(0)}%) </Text>
              <Text>-¥{invoice.rebate_amount.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>課税対象額</Text>
              <Text>¥{invoice.taxable_amount.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>消費税</Text>
              <Text>¥{invoice.tax_amount.toLocaleString()}</Text>
            </View>
            {kind === "final" ? (
              <>
                <View style={styles.totalRow}>
                  <Text>確定金額 (税込)</Text>
                  <Text>¥{grossTotal.toLocaleString()}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text>前受金充当</Text>
                  <Text>-¥{invoice.deposit_applied.toLocaleString()}</Text>
                </View>
                <View style={[styles.totalRow, styles.grand]}>
                  <Text>今回ご請求額</Text>
                  <Text>¥{invoice.total_amount.toLocaleString()}</Text>
                </View>
              </>
            ) : (
              <View style={[styles.totalRow, styles.grand]}>
                <Text>請求合計</Text>
                <Text>¥{invoice.total_amount.toLocaleString()}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text>{issuer.name}</Text>
          <Text>登録番号: {issuer.registrationNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}
