// アップデート情報 (お客様向けの変更履歴 + 使い方)
// 全体へのお知らせ・確認ポップアップ・マイページ・操作マニュアルからリンクする。URL: /updates
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { getCurrentShop } from "@/lib/shop-session";
import { getNoticeAccess } from "@/lib/feature-flags";

export const metadata = { title: "アップデート情報 | トレカ商事" };
export const dynamic = "force-dynamic";

interface Item {
  id: string;
  icon: string;
  title: string;
  /** 目次用の短い見出し */
  short: string;
  changes: string[];
  howTo: string[];
  links: { href: string; label: string }[];
  noticesOnly?: boolean;
}

const RELEASE_2026_10: Item[] = [
  {
    id: "notices",
    icon: "🔔",
    title: "新商品のお知らせが届くようになりました",
    short: "新商品のお知らせ",
    noticesOnly: true,
    changes: [
      "新しく公開された商品を、アプリの「お知らせ」でお知らせします（ご覧いただける商品のみ）",
      "新商品のまとめメールを1日1回（10:00）お送りします。新商品がない日は届きません",
      "お知らせは「全体へのお知らせ」（新商品・トレカ商事からのお知らせ）と「あなたへのお知らせ」（発注確定・発送・請求書・ランク変更など）に分かれています",
      "画面上部の🔔に未読の件数が表示されます。「すべて既読にする」でまとめて既読にできます",
    ],
    howTo: [
      "マイページ →「お知らせの受け取り設定」で、メールを受け取るかどうかと、受け取るタイトル（ポケモン・ワンピース・ヴァイス など）を選べます",
      "受け取るタイトルは、不要なタイトルのチェックを外すだけで「選んだタイトルだけ」に切り替わります",
      "メールを受け取らない設定でも、アプリ内のお知らせはご覧いただけます",
    ],
    links: [
      { href: "/notifications", label: "お知らせを見る" },
      { href: "/notifications/settings", label: "受け取り設定を開く" },
    ],
  },
  {
    id: "cart",
    icon: "🛒",
    title: "カートが使いやすくなりました",
    short: "カート",
    changes: [
      "カートに入れた商品は、ページを移動しても・画面を閉じても残るようになりました（同じ端末・同じブラウザ内）",
      "商品ページからも「カートに追加」できるようになり、発注ページと同じカートにまとまります",
      "画面上部（スマホは下のメニュー）の🛒から、カートの中身をいつでも確認できます",
    ],
    howTo: [
      "発注ページまたは商品ページで数量を選び「カートに追加」",
      "🛒を開いて内容を確認し、免責事項に同意して「リクエスト送信」",
      "数量を変えるときは、カートの商品名から商品ページを開いて、もう一度カートに追加してください",
      "受付が終了した商品がカートに残っている場合は、⚠ の表示が出ます。削除してから送信してください",
    ],
    links: [
      { href: "/cart", label: "カートを開く" },
      { href: "/order", label: "発注ページへ" },
    ],
  },
  {
    id: "release",
    icon: "📅",
    title: "発売日・メーカー希望小売価格を表示するようになりました",
    short: "発売日・希望小売価格",
    changes: [
      "発注ページと商品ページに「発売日」と「メーカー希望小売価格（税込）」を表示します",
      "発注ページの並び替えに「発売日が早い順」を追加しました",
    ],
    howTo: ["発売日が決まっていない商品は「未定」と表示されます"],
    links: [{ href: "/order", label: "発注ページへ" }],
  },
  {
    id: "history",
    icon: "📋",
    title: "発注履歴に商品名が表示されない問題を修正しました",
    short: "発注履歴の商品名",
    changes: [
      "受付が終了した商品などで、マイページの発注履歴の商品名が「—」になることがありました。発注時点の商品名を必ず表示するよう修正しました",
      "発注履歴のCSVダウンロードは、マイページの「発注履歴」の見出しの横に移動しました",
    ],
    howTo: [],
    links: [{ href: "/mypage", label: "マイページへ" }],
  },
  {
    id: "mypage",
    icon: "👤",
    title: "メニューをマイページにまとめました",
    short: "マイページ",
    changes: [
      "お問い合わせ・よくある質問・操作マニュアル・プロフィール・ログアウトは、マイページから開けるようになりました",
      "画面上部は「発注」と🔔お知らせ・🛒カート・👤マイページのアイコンに整理しました。スマホは画面下のメニューから移動できます",
      "各ページの左上に「← 戻る」を表示し、どこからでも元のページに戻れるようにしました",
    ],
    howTo: [],
    links: [{ href: "/mypage", label: "マイページへ" }],
  },
  {
    id: "legacy",
    icon: "🗂",
    title: "アプリ導入前の購入履歴を確認できるようになりました",
    short: "過去の購入履歴",
    changes: [
      "卸アプリを使い始める前からお取引いただいているお客様は、それ以前の購入履歴をマイページから確認できるようになりました（順次登録しています）",
    ],
    howTo: ["マイページ →「購入履歴（アプリ運用以前）」。登録があるお客様にだけ表示されます"],
    links: [{ href: "/mypage", label: "マイページへ" }],
  },
];

export default async function UpdatesPage() {
  const shop = await getCurrentShop();
  const noticesOn = shop ? (await getNoticeAccess(shop.id)).enabled : false;
  const items = RELEASE_2026_10.filter((i) => !i.noticesOnly || noticesOn);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <BackLink href="/mypage" label="マイページ" />
        <h1 className="text-2xl font-bold mt-1">アップデート情報</h1>
        <p className="text-sm text-slate-500 mt-1">アプリの変更内容と使い方のご案内です。</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-bold">2026年10月のアップデート</h2>
          <span className="text-xs text-slate-400">2026-10-01</span>
        </div>
        {/* 目次 */}
        <nav className="card p-4 flex flex-wrap gap-2 text-sm" aria-label="目次">
          {items.map((i) => (
            <a key={i.id} href={`#${i.id}`} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-brand-50 hover:text-brand-700">
              {i.icon} {i.short}
            </a>
          ))}
        </nav>

        {items.map((i) => (
          <article key={i.id} id={i.id} className="card p-5 sm:p-6 space-y-3 scroll-mt-20">
            <h3 className="font-bold text-base flex items-center gap-2"><span aria-hidden>{i.icon}</span>{i.title}</h3>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">変わったこと</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                {i.changes.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
            {i.howTo.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">使い方</p>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                  {i.howTo.map((h) => <li key={h}>{h}</li>)}
                </ol>
              </div>
            )}
            {i.links.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {i.links.map((l) => <Link key={l.href + l.label} href={l.href} className="btn-secondary text-xs">{l.label} →</Link>)}
              </div>
            )}
          </article>
        ))}
      </section>

      <p className="text-xs text-slate-400">ご不明な点は マイページ →「お問い合わせ / チャット」からお気軽にご連絡ください。</p>
    </div>
  );
}
