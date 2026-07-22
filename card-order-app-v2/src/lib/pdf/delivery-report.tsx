// 納品報告書 PDF — 納品完了(delivered_at)を証憑化。株式会社パレットグループ 体裁。
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { registerJpFont, JP_FONT_FAMILY } from "./fonts";
import { ISSUER, HAS_SEAL, SEAL_PATH } from "./issuer";

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
  table: { marginTop: 18, borderTop: "1pt solid #666" },
  th: { flexDirection: "row", backgroundColor: "#eef2f7", borderBottom: "1pt solid #666" },
  td: { flexDirection: "row", borderBottom: "1pt solid #e2e8f0", minHeight: 20 },
  cNo: { width: 26, padding: 4, textAlign: "center" },
  cDesc: { flex: 1, padding: 4 },
  cQty: { width: 70, padding: 4, textAlign: "center" },
  info: { marginTop: 16, flexDirection: "row" },
  infoBox: { flex: 1, border: "1pt solid #999", padding: 8, marginRight: 8 },
  label: { fontSize: 8, color: "#666" },
  remarksBox: { flexDirection: "row", marginTop: 16, border: "1pt solid #999", minHeight: 44 },
  remarksLabel: { width: 60, padding: 6, backgroundColor: "#eef2f7", textAlign: "center" },
  remarksBody: { flex: 1, padding: 6, fontSize: 8.5 },
});

export interface DeliveryReportProps {
  reportNo: string;
  deliveredAt: string;   // YYYY-MM-DD
  shopName: string;
  productTitle: string;
  qty: number;
  unit: string;
  carrier: string | null;
  trackingNumber: string | null;
}

function jp(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export function DeliveryReportPdf(p: DeliveryReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>納 品 報 告 書</Text>

        <View style={styles.topRow}>
          <Text style={styles.custName}>{p.shopName}　御中</Text>
          <View style={styles.dateBox}>
            <Text>納品報告書No.　{p.reportNo}</Text>
            <Text>納品日　{jp(p.deliveredAt)}</Text>
          </View>
        </View>

        <View style={styles.subjectRow}>
          <View>
            <Text style={styles.subject}>件名： 商品の納品</Text>
            <Text style={{ marginTop: 6 }}>下記の通り、納品を完了いたしましたのでご報告申し上げます。</Text>
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

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cNo}>No.</Text>
            <Text style={styles.cDesc}>商品名</Text>
            <Text style={styles.cQty}>数量</Text>
          </View>
          <View style={styles.td}>
            <Text style={styles.cNo}>1</Text>
            <Text style={styles.cDesc}>{p.productTitle}</Text>
            <Text style={styles.cQty}>{p.qty} {p.unit}</Text>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.infoBox}><Text style={styles.label}>配送会社</Text><Text>{p.carrier || "—"}</Text></View>
          <View style={styles.infoBox}><Text style={styles.label}>追跡番号</Text><Text>{p.trackingNumber || "—"}</Text></View>
          <View style={styles.infoBox}><Text style={styles.label}>納品完了日</Text><Text>{jp(p.deliveredAt)}</Text></View>
        </View>

        <View style={styles.remarksBox}>
          <Text style={styles.remarksLabel}>備考</Text>
          <Text style={styles.remarksBody}>本書は納品完了(収益認識)の証憑としてご利用いただけます。</Text>
        </View>
      </Page>
    </Document>
  );
}
