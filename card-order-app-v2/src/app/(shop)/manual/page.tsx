import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { SHOP_MANUAL } from "@/manuals/shop";
import { MarkdownManual } from "@/components/MarkdownManual";

export const metadata = { title: "操作マニュアル | トレカ商事" };

export default function ShopManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <BackLink href="/mypage" label="マイページ" />
      <MarkdownManual markdown={SHOP_MANUAL} />
    </div>
  );
}
