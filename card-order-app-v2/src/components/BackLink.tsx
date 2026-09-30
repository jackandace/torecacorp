import Link from "next/link";

/**
 * ページ左上の「← 戻り先」リンク。ショップ画面の詳細・サブページはすべてこれで統一する
 * (マイページから入るページは「マイページ」、一覧の詳細は「〇〇一覧」へ戻す)。
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
}
