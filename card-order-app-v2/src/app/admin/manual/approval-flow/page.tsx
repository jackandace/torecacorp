// 問屋登録の承認フロー 手順書 (画面キャプチャ付き・社内限定)
// スクリーンショットは /public に置くと未認証で取得できてしまうため
// base64 埋め込み (src/manuals/approval-flow-images.ts) で admin 認証内に閉じる。
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  IMG_APPROVAL_LIST,
  IMG_CARD_COMPARE,
  IMG_EDIT_WARNINGS,
  IMG_EDIT_DEADLINE,
} from "@/manuals/approval-flow-images";

export const metadata = { title: "問屋登録の承認フロー | 管理" };

function Step({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6 space-y-3">
      <h2 className="font-bold text-lg flex items-baseline gap-2.5">
        <span className="bg-brand-600 text-white text-xs rounded-md px-2 py-0.5 whitespace-nowrap">{no}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Shot({ src, alt, cap }: { src: string; alt: string; cap: string }) {
  return (
    <figure className="m-0">
      <img src={src} alt={alt} className="w-full rounded-lg border border-slate-200" />
      <figcaption className="text-xs text-slate-500 mt-1">▲ {cap}</figcaption>
    </figure>
  );
}

export default function ApprovalFlowManualPage() {
  return (
    <div className="max-w-3xl space-y-5 text-sm leading-7">
      <div>
        <Link href="/admin/manual" className="text-sm text-brand-600 hover:underline">← 操作マニュアルへ戻る</Link>
        <h1 className="text-2xl font-bold mt-1">問屋登録の承認フロー（画面つき手順書）</h1>
        <p className="text-slate-500 mt-1">
          橋本さん（問屋）がポータルから商品を登録したあと、内容を確認して承認し、ショップに公開するまでの手順です。
          <b>承認するまでショップには一切表示されない</b>ので、落ち着いて作業して大丈夫です。
        </p>
        <span className="inline-block mt-2 text-[11px] font-bold text-white bg-rose-600 rounded px-2 py-0.5">社内限定・外部共有禁止</span>
      </div>

      <div className="rounded-xl bg-slate-900 text-slate-100 p-5 text-[13px] leading-8">
        橋本さんが商品登録（フォーム / Excel）→ 自動で<b className="text-sky-300">「承認待ち」</b>になる（ショップにはまだ見えない）<br />
        → <b>①</b> 「問屋登録承認」で新着チェック → <b>②</b> 「確認・編集」で掛け率などを設定して保存<br />
        → <b>③</b> 「承認して公開」→ ショップに公開（以降は通常の発注フロー）
      </div>

      <Step no="STEP 1" title="「問屋登録承認」を開いて新着を確認">
        <p>サイドバーの<b>「問屋登録承認」</b>をクリック。承認待ちの商品がカードで並びます。登録があっても通知メールは飛ばないため、<b>毎日1回のチェック</b>を習慣にしてください。</p>
        <Shot src={IMG_APPROVAL_LIST} alt="問屋登録承認の一覧画面" cap="承認待ち一覧。左サイドバーの「問屋登録承認」から開く" />
        <div className="rounded-md bg-brand-50 border-l-4 border-brand-500 px-4 py-2.5">
          「🧪 TEST」バッジのカードは検証用アカウントの練習データです。承認ボタンが押せないようになっているので<b>無視してOK</b>（邪魔なら「削除」で消して構いません）。
        </div>
      </Step>

      <Step no="STEP 2" title="カードの見方 — 本番とテストを見分ける">
        <Shot src={IMG_CARD_COMPARE} alt="テストカードと本番カードの比較" cap="上: 🧪TEST付き（承認不可・グレー）／ 下: 「株式会社橋本」の本番登録（青い「承認して公開」ボタン）" />
        <ul className="list-disc pl-5 space-y-1">
          <li><b>問屋名バッジ</b>が「株式会社橋本」＝本番の登録。ここが作業対象</li>
          <li>定価・1CT=◯BOX・最低◯BOX・数量・締切・<b className="text-rose-600">赤字の「掛け率 未設定」</b>を確認</li>
          <li><b>📝 問屋メモ</b>は橋本さんからの申し送り（出荷条件など）。必ず読む</li>
        </ul>
      </Step>

      <Step no="STEP 3" title="「確認・編集」で開く — 赤い警告ボックスが「やることリスト」">
        <Shot src={IMG_EDIT_WARNINGS} alt="商品編集画面の警告と掛け率欄" cap="商品編集画面。上部の赤いボックスに「公開までに直すこと」が全部書いてある" />
        <ul className="list-disc pl-5 space-y-1">
          <li><b>実掛け率</b>: 橋本さんの案内に記載の掛け率を入力（例: 74% → <code className="bg-slate-100 px-1 rounded">0.74</code>）</li>
          <li><b>上乗せ率</b>: 基本は既定の <code className="bg-slate-100 px-1 rounded">0.1</code>（10%）のまま。案内掛け率が自動計算されます</li>
          <li><b>最低発注数</b>: 発注可能数より大きいと誰も発注できません。警告が出ていたら下げる</li>
        </ul>
        <div className="rounded-md bg-amber-50 border-l-4 border-amber-500 px-4 py-2.5">
          <b>注意</b>: 掛け率と定価は金額に直結します。橋本さんの案内メール・シートと指差し確認してください。
        </div>
      </Step>

      <Step no="STEP 4" title="締切・JANを入れて「保存」">
        <Shot src={IMG_EDIT_DEADLINE} alt="締切・JAN・保存ボタン周辺" cap="発注締切（＝橋本さんの締め日）とJANを入力し、「保存」。この時点ではまだ非公開" />
        <ul className="list-disc pl-5 space-y-1">
          <li><b>発注締切</b>: 未設定のまま公開すると無期限受付になるため必ず入れる（2026-09-08以前の登録は締め日欄が無かった時期のもの。案内メールの締め日を転記）</li>
          <li>JANは「Webから取得」（商品ページURL貼り付け）でも自動取得できます</li>
          <li>「ショップに公開する」のチェックは<b>触らなくてOK</b>（次の承認操作で自動公開されます）</li>
        </ul>
      </Step>

      <Step no="STEP 5" title="「承認して公開」で完了">
        <p>「問屋登録承認」に戻り、該当カードの青い<b>「承認して公開」</b>→ 確認ダイアログでOK。ショップに公開（受付中）され、以降は通常の商品と同じフロー（発注受付 → 配分 → 確定 → 出荷）です。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>設定漏れが残っていると承認できず、理由が表示されます → STEP 3〜4 に戻る</li>
          <li>内容がおかしい登録は「削除」で差し戻し。<b>自動通知はありません</b>。削除したら橋本さんへ理由と再登録依頼をメールで必ず連絡</li>
          <li>誤って公開した場合は、在庫管理でその商品の「ショップに公開する」を外して保存すれば非公開に戻せます</li>
        </ul>
      </Step>

      <section className="card p-5 sm:p-6 space-y-3">
        <h2 className="font-bold text-lg">よくある質問</h2>
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">Q. 🧪TESTのカードが溜まっていたら？</dt>
            <dd className="text-slate-600 ml-0">検証用アカウントの練習データです。「削除」で消してOK（本番には無関係）。</dd>
          </div>
          <div>
            <dt className="font-semibold">Q. 承認ボタンで「公開前チェックに未解決のエラー」と出た</dt>
            <dd className="text-slate-600 ml-0">STEP 3〜4 の項目に漏れがあります。「確認・編集」の赤い警告ボックスを見て埋めてください。</dd>
          </div>
          <div>
            <dt className="font-semibold">Q. 間違えて承認・公開してしまった</dt>
            <dd className="text-slate-600 ml-0">在庫管理でその商品の「ショップに公開する」を外して保存すれば非公開に戻せます。</dd>
          </div>
        </dl>
      </section>

      <p className="text-xs text-slate-400">
        背景知識（業界構造・事故ポイント）は <Link href="/admin/manual/onboarding" className="text-brand-600 underline">新人研修マニュアル</Link> を参照。
      </p>
    </div>
  );
}
