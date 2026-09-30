// 購入履歴 (卸アプリ運用以前) の操作マニュアル — 実際の操作録画つき (社内限定)
// 録画はテスト用ショップ (鈴木テスト商店) で本番管理画面を操作して撮影したもの。
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export const metadata = { title: "購入履歴（アプリ運用以前）の操作マニュアル | 管理" };

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

function Rec({ name, cap }: { name: string; cap: string }) {
  return (
    <figure className="m-0">
      <img src={`/api/manual-media/${name}`} alt={cap} loading="lazy" className="w-full rounded-lg border border-slate-200" />
      <figcaption className="text-xs text-slate-500 mt-1">▶ {cap}（実際の操作を録画・自動でくり返し再生）</figcaption>
    </figure>
  );
}

export default function LegacyPurchasesManualPage() {
  return (
    <div className="max-w-4xl space-y-5 text-sm leading-7">
      <div>
        <Link href="/admin/manual" className="text-sm text-brand-600 hover:underline">← 操作マニュアルへ戻る</Link>
        <h1 className="text-2xl font-bold mt-1">購入履歴（卸アプリ運用以前）の登録マニュアル</h1>
        <p className="text-slate-500 mt-1">
          卸アプリを使い始める前からお取引のあるお客様について、過去の購入実績（商品名・数量・金額・出荷状況）を登録し、
          お客様のマイページでも確認できるようにする機能です。
        </p>
        <span className="inline-block mt-2 text-[11px] font-bold text-white bg-rose-600 rounded px-2 py-0.5">社内限定・外部共有禁止</span>
      </div>

      <div className="rounded-xl bg-slate-900 text-slate-100 p-5 text-[13px] leading-8">
        <b className="text-sky-300">場所</b>: 顧客管理 → お客様を開く → 上部の「購入履歴（卸アプリ運用以前）」<br />
        <b className="text-sky-300">金額</b>: すべて<b>税抜</b>で入力<br />
        <b className="text-sky-300">お客様への表示</b>: 登録するとマイページに表示されます（「社内メモ」欄だけは表示されません）<br />
        <b className="text-sky-300">集計との関係</b>: ランク・リベート・請求・累計取引額の計算には<b>一切入りません</b>（参照用の記録）<br />
        <b className="text-sky-300">通知</b>: 登録・出荷済への切り替えで、お客様にメールは<b>届きません</b>
      </div>

      <Step no="操作 1" title="1件ずつ登録する">
        <Rec name="legacy-add" cap="お客様の詳細画面 → 購入履歴 →「+ 購入履歴を追加」→ 入力 → 保存" />
        <ol className="list-decimal pl-5 space-y-1">
          <li>顧客管理でお客様を開き、上部の<b>「購入履歴（卸アプリ運用以前）」</b>をクリック</li>
          <li>右上の<b>「+ 購入履歴を追加」</b></li>
          <li>購入日・商品名・数量・単価（税抜）を入力。<b>金額は「数量×単価」で自動計算</b>されます（値引きなどは金額欄を直接書き換えればOK）</li>
          <li>出荷状況（出荷済 / 未出荷）を選び、必要なら備考・社内メモを入れて<b>「保存」</b></li>
        </ol>
        <div className="rounded-md bg-amber-50 border-l-4 border-amber-500 px-4 py-2.5">
          <b>備考</b>はお客様のマイページにも表示されます。社内だけで共有したい内容は<b>「社内メモ」</b>に書いてください。
        </div>
        <p className="text-xs text-slate-500">購入日欄は「年」を入力したあと Tab キーで「月」「日」に進むと入力しやすいです。カレンダーアイコンから選んでも構いません。</p>
      </Step>

      <Step no="操作 2" title="テンプレートでまとめて取り込む（件数が多いとき）">
        <Rec name="legacy-import" cap="一括取込 → ファイル選択 →「内容を確認」でエラー表示 → 修正版で確認 →「この内容で登録」" />
        <ol className="list-decimal pl-5 space-y-1">
          <li>購入履歴ページの<b>「テンプレートをダウンロード」</b>で Excel を取得</li>
          <li>「購入履歴」シートの<b>2行目から</b>入力（1行目の見出しは変えない・列を足さない・並べ替えない）。書き方は「記入例・ルール」シートを参照</li>
          <li><b>「一括取込」</b>→ ファイルを選択 →<b>「内容を確認」</b></li>
          <li>赤い行（<b>✕ エラー</b>）があると登録ボタンは押せません。Excel を直して選び直し、もう一度「内容を確認」</li>
          <li>エラーが0件になったら<b>「この内容で登録」</b></li>
        </ol>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-slate-100">
              <th className="border border-slate-200 px-3 py-2 text-left w-28">表示</th>
              <th className="border border-slate-200 px-3 py-2 text-left">よくある原因</th>
              <th className="border border-slate-200 px-3 py-2 text-left w-40">登録</th>
            </tr></thead>
            <tbody>
              <tr><td className="border border-slate-200 px-3 py-2 text-rose-700 font-semibold">✕ エラー</td><td className="border border-slate-200 px-3 py-2">購入日が「12月5日」など YYYY/MM/DD 以外 / 出荷状況が「発送済」など選択肢外 / 数量・単価が数字でない / 未来の日付</td><td className="border border-slate-200 px-3 py-2">1行でもあると<b>全件登録不可</b></td></tr>
              <tr><td className="border border-slate-200 px-3 py-2 text-amber-700 font-semibold">⚠ 警告</td><td className="border border-slate-200 px-3 py-2">金額が 数量×単価 と違う / ファイル内に同じ行がある / すでに同じ内容が登録済み（二重取込）</td><td className="border border-slate-200 px-3 py-2">登録できる（内容を確認して判断）</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2">見出し不一致</td><td className="border border-slate-200 px-3 py-2">古いテンプレート・列の追加や並べ替え・見出しの書き換え</td><td className="border border-slate-200 px-3 py-2">ファイルごと受け付けない → 最新テンプレートに貼り直す</td></tr>
            </tbody>
          </table>
        </div>
      </Step>

      <Step no="操作 3" title="未出荷の商品を出荷したら「出荷済」に切り替える">
        <Rec name="legacy-ship" cap="未出荷の行の「編集」→ 出荷状況を「出荷済」→ 保存 → 未出荷の件数が減る" />
        <ul className="list-disc pl-5 space-y-1">
          <li>未出荷の行は<b>黄色</b>で表示され、上部の「未出荷」件数にも出ます</li>
          <li>出荷したら「編集」→ 出荷状況を<b>「出荷済」</b>→ 保存</li>
          <li>切り替えてもお客様へのメール通知はありません（マイページの表示が「出荷済」に変わるだけ）</li>
        </ul>
      </Step>

      <Step no="操作 4" title="間違えて取り込んだときは、取込ごとまとめて取り消す">
        <Rec name="legacy-undo" cap="ページ下の「取込履歴」→「この取込を取り消す」→ その取込で入った行がまとめて消える" />
        <ul className="list-disc pl-5 space-y-1">
          <li>ページ下部の<b>「取込履歴」</b>に、取込ごとの日時・件数・金額が並びます</li>
          <li><b>「この取込を取り消す」</b>で、その取込で登録した行だけがまとめて消えます（手動で登録した行は残ります）</li>
          <li>1件だけ間違えた場合は、その行の「削除」または「編集」で直してください</li>
        </ul>
      </Step>

      <section className="card p-5 sm:p-6 space-y-3">
        <h2 className="font-bold text-lg">お客様側の見え方（マイページ）</h2>
        <p>登録が1件以上あるお客様には、マイページに「購入履歴（アプリ運用以前）」のリンクが表示されます。閲覧のみで、期間・商品名で検索できます。</p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 pointer-events-none select-none">
          <div className="card p-4 flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold">購入履歴（アプリ運用以前）</p>
              <p className="text-xs text-slate-500 mt-0.5">卸アプリ運用以前にご購入いただいた商品の履歴（5 件）</p>
            </div>
            <span className="text-sm text-brand-600">見る →</span>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead className="bg-slate-50 text-slate-600"><tr>
                <th className="text-left px-3 py-2">購入日</th><th className="text-left px-3 py-2">商品名</th>
                <th className="text-right px-3 py-2">数量</th><th className="text-right px-3 py-2">単価(税抜)</th>
                <th className="text-right px-3 py-2">金額(税抜)</th><th className="text-left px-3 py-2">出荷</th>
              </tr></thead>
              <tbody>
                <tr className="border-t border-slate-100"><td className="px-3 py-2">2026/02/10</td><td className="px-3 py-2">遊戯王OCG デュエリストパック 爆炎のデュエリスト編<div className="text-slate-500">備考: 3月入荷予定分</div></td><td className="px-3 py-2 text-right">5BOX</td><td className="px-3 py-2 text-right">¥2,400</td><td className="px-3 py-2 text-right">¥12,000</td><td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">未出荷</span></td></tr>
                <tr className="border-t border-slate-100"><td className="px-3 py-2">2025/03/15</td><td className="px-3 py-2">ポケモンカードゲーム スカーレット&amp;バイオレット 拡張パック クレイバースト</td><td className="px-3 py-2 text-right">10BOX</td><td className="px-3 py-2 text-right">¥4,800</td><td className="px-3 py-2 text-right">¥48,000</td><td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">出荷済</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-slate-500">▲ 画面例（お客様側はログインしたお客様本人しか開けないため、実画面と同じ見た目で再現しています）。社内メモはお客様には表示されません。</p>
      </section>

      <section className="card p-5 sm:p-6 space-y-3">
        <h2 className="font-bold text-lg">よくある質問</h2>
        <dl className="space-y-3">
          <div><dt className="font-semibold">Q. 登録した金額はランクや累計取引額に反映される？</dt>
            <dd className="text-slate-600 ml-0">反映されません。累計取引額は従来どおり顧客詳細の「累計発注額」欄で管理します。購入履歴はあくまで参照用です。</dd></div>
          <div><dt className="font-semibold">Q. 税込の金額しか分からない</dt>
            <dd className="text-slate-600 ml-0">この機能は税抜で統一しています。税込額を 1.1 で割って（端数は切り捨て）入力し、必要なら社内メモに「税込〇〇円から換算」と残してください。</dd></div>
          <div><dt className="font-semibold">Q. 間違って登録した / 取り込んだ</dt>
            <dd className="text-slate-600 ml-0">1件なら「編集」または「削除」。取込まるごとなら「取込履歴」→「この取込を取り消す」。どちらもお客様のマイページからもすぐ消えます。</dd></div>
          <div><dt className="font-semibold">Q. 当時の請求書（PDF）も見せたい</dt>
            <dd className="text-slate-600 ml-0">現在検討中です。決まるまでは、顧客詳細の既存「過去請求書」アップロードは使わずにお待ちください（お客様側のダウンロードに不具合が見つかっているため）。</dd></div>
        </dl>
      </section>
    </div>
  );
}
