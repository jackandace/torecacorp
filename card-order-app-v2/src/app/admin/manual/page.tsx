import { ADMIN_MANUAL } from "@/manuals/admin";
import { SHOP_MANUAL } from "@/manuals/shop";
import { MarkdownManual } from "@/components/MarkdownManual";
import { ManualTabs } from "./ManualTabs";

export const metadata = { title: "操作マニュアル | 管理" };

export default function AdminManualPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">操作マニュアル</h1>
      <p className="text-sm text-slate-500">
        管理者向けは admin 権限を持つスタッフのみ閲覧できます。ショップ向けの内容も参考として確認できます。
      </p>
      <ManualTabs
        adminManual={<MarkdownManual markdown={ADMIN_MANUAL} />}
        shopManual={<MarkdownManual markdown={SHOP_MANUAL} />}
      />
    </div>
  );
}
