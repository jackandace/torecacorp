import Link from "next/link";
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

      {/* 新人向け研修マニュアルへの導線 */}
      <Link
        href="/admin/manual/onboarding"
        className="block rounded-xl border border-brand-100 bg-brand-50 p-4 sm:p-5 hover:bg-brand-100 transition"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>🎓</span>
          <div>
            <p className="font-semibold text-brand-700">新人スタッフはまずこちら — 研修マニュアル</p>
            <p className="text-sm text-slate-600 mt-0.5">
              業界の流通構造・タイトルのティア戦略・リベートと保証金の仕組み・実際に起きた事故ポイント集。
              問い合わせから取引までの全体像がわかります（社内限定）。
            </p>
          </div>
        </div>
      </Link>
      <ManualTabs
        adminManual={<MarkdownManual markdown={ADMIN_MANUAL} />}
        shopManual={<MarkdownManual markdown={SHOP_MANUAL} />}
      />
    </div>
  );
}
