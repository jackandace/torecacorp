import Link from "next/link";
import { ONBOARDING_MANUAL } from "@/manuals/onboarding";
import { MarkdownManual } from "@/components/MarkdownManual";

export const metadata = { title: "新人研修マニュアル | 管理" };

export default function OnboardingManualPage() {
  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/admin/manual" className="text-sm text-brand-600 hover:underline">
        ← 操作マニュアルへ戻る
      </Link>
      <h1 className="text-2xl font-bold">新人スタッフ研修マニュアル</h1>
      <p className="text-sm text-slate-500">
        業界構造・取引の慣わし・事故ポイントをまとめた社内限定資料です。ショップには共有しないでください。
      </p>
      <MarkdownManual markdown={ONBOARDING_MANUAL} />
    </div>
  );
}
