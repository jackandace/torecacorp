import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { SHOP_MANUAL } from "@/manuals/shop";
import { MarkdownManual } from "@/components/MarkdownManual";

export const metadata = { title: "操作マニュアル | トレカ商事" };

export default function ShopManualPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <BackLink href="/mypage" label="マイページ" />
      <Link href="/updates" className="block card p-4 hover:bg-slate-50 transition">
        <p className="font-semibold text-sm">2026年10月のアップデート（カート・発売日表示・お知らせ など）</p>
        <p className="text-xs text-slate-500 mt-0.5">変わったことと使い方はこちら →</p>
      </Link>
      <MarkdownManual markdown={SHOP_MANUAL} />
    </div>
  );
}
