import { TERMS_SECTIONS, TERMS_VERSION } from "@/constants/terms";
import { BackLink } from "@/components/BackLink";

export const metadata = { title: "利用注意事項・免責事項 | トレカ商事" };

export default function TermsPage({ searchParams }: { searchParams: { from?: string } }) {
  // 開いた元へ戻す: 審査申込みフォーム (入力内容はフォーム側で保持) / マイページ / それ以外はログイン
  const back =
    searchParams.from === "apply" ? { href: "/apply", label: "申込みフォーム" }
    : searchParams.from === "mypage" ? { href: "/mypage", label: "マイページ" }
    : { href: "/login", label: "ログインページ" };
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-3"><BackLink href={back.href} label={back.label} /></div>
        <div className="card p-8 sm:p-12">
          <h1 className="text-2xl font-bold mb-1">利用注意事項・免責事項</h1>
          <p className="text-xs text-slate-500 mb-8">最終改定: {TERMS_VERSION}</p>

          <div className="space-y-8">
            {TERMS_SECTIONS.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold border-b border-slate-200 pb-2 mb-3">
                  {section.heading}
                </h2>
                <ul className="space-y-2 text-sm text-slate-700 list-disc list-outside ml-5">
                  {section.items.map((item, i) => (
                    <li key={i} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 text-center">
            <BackLink href={back.href} label={`${back.label}へ戻る`} />
          </div>
        </div>
      </div>
    </main>
  );
}
