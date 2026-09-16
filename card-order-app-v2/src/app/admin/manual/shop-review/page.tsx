// ショップ登録申請 → 審査 (承認 / 否決) の手順書 (社内限定)
// 画面例は実際のカード UI と同じマークアップで再現した静的モック。
import Link from "next/link";

export const metadata = { title: "ショップ登録申請の審査フロー | 管理" };

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

function Mock({ cap, children }: { cap: string; children: React.ReactNode }) {
  return (
    <figure className="m-0">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 pointer-events-none select-none">{children}</div>
      <figcaption className="text-xs text-slate-500 mt-1">▲ {cap}</figcaption>
    </figure>
  );
}

/** 実際の申請カード (審査待ち) の見た目を再現 */
function MockPendingCard() {
  return (
    <div className="card p-4 sm:p-5 text-sm">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">カードショップ サンプル堂</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">審査待ち</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">実店舗 + EC</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-slate-600">
            <span>担当: 山田 太郎</span>
            <span>📧 sample-shop@example.com</span>
            <span>☎ 03-1234-5678</span>
            <span>開業日: 2022-06-01</span>
            <span className="sm:col-span-2">登録住所: 160-0022 東京都新宿区新宿3-1-1 サンプルビル2F</span>
            <span className="sm:col-span-2">配送先: 160-0022 東京都新宿区新宿3-1-1 サンプルビル2F</span>
            <span className="sm:col-span-2">URL: <span className="text-brand-600 underline">https://example.com/sampledo</span></span>
          </div>
          <p className="text-xs text-slate-700 bg-slate-50 rounded px-2 py-1">🎴 希望タイトル: ポケモンカード、遊戯王、デュエル・マスターズ</p>
          <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">📝 備考: 実店舗2店舗を運営しています。よろしくお願いします。</p>
          <p className="text-[11px] text-slate-400">申請: 2026-09-16 11:39</p>
        </div>
        <div className="flex flex-col items-stretch lg:items-end gap-1.5 shrink-0">
          <div className="flex gap-2">
            <span className="btn-primary text-xs">承認して招待メールを送る</span>
            <span className="text-xs text-rose-600 underline self-center">却下…</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 「却下…」を押したあとの入力パネル */
function MockRejectPanel() {
  return (
    <div className="flex flex-col gap-2 w-full lg:w-72 ml-auto">
      <div className="input text-xs bg-white text-slate-700 min-h-[3.2rem]">実店舗の確認が取れないため</div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" readOnly />
        <span>申請者にお断りメールを送る</span>
      </label>
      <div className="flex gap-2">
        <span className="text-xs rounded-md bg-rose-600 text-white px-3 py-2 font-semibold">却下を確定</span>
        <span className="btn-secondary text-xs">キャンセル</span>
      </div>
    </div>
  );
}

/** 承認済みタブのカード (登録リンク期限切れ) */
function MockApprovedExpired() {
  return (
    <div className="card p-4 sm:p-5 text-sm">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">カードショップ サンプル堂</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">承認済み</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">実店舗 + EC</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">登録リンク期限切れ</span>
          </div>
          <p className="text-[11px] text-slate-400">申請: 2026-09-16 11:39 / 審査: 2026-09-16 11:41</p>
        </div>
        <div className="shrink-0">
          <span className="btn-primary text-xs">登録リンクを再発行して再送</span>
        </div>
      </div>
    </div>
  );
}

export default function ShopReviewManualPage() {
  return (
    <div className="max-w-3xl space-y-5 text-sm leading-7">
      <div>
        <Link href="/admin/manual" className="text-sm text-brand-600 hover:underline">← 操作マニュアルへ戻る</Link>
        <h1 className="text-2xl font-bold mt-1">ショップ登録申請の審査フロー（申請 → 承認 / 否決）</h1>
        <p className="text-slate-500 mt-1">
          新規ショップ様が公開の申込みフォームから申請してきたものを、管理画面「ショップ審査」で確認し、
          承認（登録リンクを自動送付）または否決するまでの手順です。
          <b>承認するまでショップアカウントは作られない</b>ので、落ち着いて確認してから押して大丈夫です。
        </p>
        <span className="inline-block mt-2 text-[11px] font-bold text-white bg-rose-600 rounded px-2 py-0.5">社内限定・外部共有禁止</span>
      </div>

      {/* 全体フロー */}
      <div className="rounded-xl bg-slate-900 text-slate-100 p-5 text-[13px] leading-8">
        <b className="text-sky-300">① 問い合わせ</b>（Studio の「卸取引について」）→ 自動返信で申込みフォームを案内<br />
        → <b className="text-sky-300">② 申請</b> ショップ様が <code className="bg-slate-700 px-1 rounded">/apply</code> に入力・送信 → 申請者に受付メール／スタッフに「新規申込み」通知メール<br />
        → <b className="text-sky-300">③ 審査</b> 管理画面「ショップ審査」で内容確認<br />
        → <b className="text-emerald-300">④-A 承認</b> 登録リンク付きメールを自動送信（14日有効） → ショップ様が登録 → 以降は通常運用<br />
        → <b className="text-rose-300">④-B 否決</b> 審査メモを記録（お断りメールは任意）
      </div>

      <Step no="STEP 1" title="申込みに気づく — 通知メール or サイドバー「ショップ審査」">
        <ul className="list-disc pl-5 space-y-1">
          <li>新しい申請が入ると <b>「【ショップ審査】新規申込み: ○○様」</b> というメールがスタッフ宛に届きます。メール内のリンクから一覧に飛べます</li>
          <li>サイドバーの<b>「ショップ審査」</b>（顧客管理の下）からも開けます。審査待ちが残っていると「審査待ち」タブに<span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-xs mx-1">1</span>のような件数バッジが出ます</li>
          <li>問い合わせ段階でも「【卸問い合わせ】審査フォームを自動案内しました」というメールが届きますが、これは<b>案内を送っただけ</b>の通知です。申請が来るまで作業はありません</li>
        </ul>
      </Step>

      <Step no="STEP 2" title="申請カードの見方 — 確認ポイント">
        <Mock cap="審査待ちタブの申請カード（例）。申込みフォームの入力内容がすべて表示される">
          <MockPendingCard />
        </Mock>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-3 py-2 text-left w-40">確認項目</th>
                <th className="border border-slate-200 px-3 py-2 text-left">見るところ・判断の目安</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-200 px-3 py-2 font-semibold">実店舗があるか</td><td className="border border-slate-200 px-3 py-2">運営形態バッジ（実店舗のみ / 実店舗 + EC）と登録住所。<b>EC のみはフォーム側で申込み不可</b>なので原則届きません</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2 font-semibold">運営歴</td><td className="border border-slate-200 px-3 py-2">開業日。ティア1タイトル（ポケカ・ワンピ等）の案内は運営 1〜2 年以上が目安</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2 font-semibold">実在性</td><td className="border border-slate-200 px-3 py-2">店舗紹介 / EC サイト URL（SNS 可）。実際に開いて店舗の様子を確認</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2 font-semibold">請求・配送まわり</td><td className="border border-slate-200 px-3 py-2">請求書発行先名称・配送先住所・受取人名（会社名と違う場合のみ表示）</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2 font-semibold">希望タイトル・備考</td><td className="border border-slate-200 px-3 py-2">案内したいタイトルの参考に。備考に質問が書かれていることもあるので必ず読む</td></tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-md bg-brand-50 border-l-4 border-brand-500 px-4 py-2.5">
          内容に不明点があれば、カードに表示されているメールアドレスへ<b>先に直接連絡して確認</b>してから審査して構いません。承認・却下はいつ押しても大丈夫です。
        </div>
      </Step>

      <Step no="STEP 3-A" title="承認する — ボタン1つで登録リンクまで自動送付">
        <ol className="list-decimal pl-5 space-y-1">
          <li>カード右側の青い<b>「承認して招待メールを送る」</b>を押す</li>
          <li>確認ダイアログで OK</li>
          <li>これで完了。申請者に<b>登録リンク付きの審査通過メール</b>が自動送信されます（リンクは <b>14日間</b>有効）</li>
        </ol>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          <li>承認したカードは「承認済み」タブに移動し、審査日時が記録されます</li>
          <li>登録フォームには申込み内容があらかじめ入っているので、ショップ様はほぼ確認だけで登録できます</li>
          <li>もしメール送信に失敗した場合は画面に登録リンクが表示されます。コピーして手動でメール案内してください</li>
        </ul>
      </Step>

      <Step no="STEP 3-B" title="否決する — 審査メモを残す（お断りメールは任意）">
        <Mock cap="「却下…」を押すと、カード右側がこの入力パネルに変わる">
          <MockRejectPanel />
        </Mock>
        <ol className="list-decimal pl-5 space-y-1">
          <li>カード右側の赤い<b>「却下…」</b>を押す</li>
          <li><b>審査メモ</b>に理由を入力（社内用。申請者には見えません。あとから「却下」タブで確認できます）</li>
          <li><b>申請者にお断りメールを送る</b>場合のみチェックを入れる。<b>初期状態は送信しない（記録のみ）</b></li>
          <li><b>「却下を確定」</b>を押す</li>
        </ol>
        <div className="rounded-md bg-amber-50 border-l-4 border-amber-500 px-4 py-2.5">
          <b>注意</b>: お断りメールは定型文（「今回はお取引を見送らせていただく」）です。個別に事情を伝えたい場合はチェックを入れず、別途ご自身のメールで連絡してください。
        </div>
      </Step>

      <Step no="STEP 4" title="承認後の追跡 — 登録リンクの状態と期限切れ対応">
        <p>「承認済み」タブでは、各申請に<b>登録リンクの状態</b>がバッジで表示されます。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-3 py-2 text-left w-44">バッジ</th>
                <th className="border border-slate-200 px-3 py-2 text-left">意味</th>
                <th className="border border-slate-200 px-3 py-2 text-left">やること</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-200 px-3 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">登録リンク有効</span></td><td className="border border-slate-200 px-3 py-2">期限内・まだ未登録</td><td className="border border-slate-200 px-3 py-2">待つ。催促したい場合は「登録リンクを再送…」で新しいリンクを再送できます</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">登録リンク期限切れ</span></td><td className="border border-slate-200 px-3 py-2">14日経過して未登録</td><td className="border border-slate-200 px-3 py-2"><b>「登録リンクを再発行して再送」</b>を押す → 新しい14日リンク付きの再発行メールが自動送信</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">ショップ登録完了</span></td><td className="border border-slate-200 px-3 py-2">ショップ様が登録を完了</td><td className="border border-slate-200 px-3 py-2">何もしなくて OK。以降は「顧客管理」で通常どおり</td></tr>
            </tbody>
          </table>
        </div>
        <Mock cap="期限切れになった承認済みカード。青いボタンで再発行・再送できる">
          <MockApprovedExpired />
        </Mock>
        <p className="text-slate-600">再発行しても申込み内容は引き継がれるため、ショップ様は再入力なしで登録できます。古いリンクは自動で無効になります。</p>
      </Step>

      <section className="card p-5 sm:p-6 space-y-3">
        <h2 className="font-bold text-lg">メールの一覧（誰に・いつ・自動か）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-200 px-3 py-2 text-left">タイミング</th>
                <th className="border border-slate-200 px-3 py-2 text-left">宛先</th>
                <th className="border border-slate-200 px-3 py-2 text-left">件名</th>
                <th className="border border-slate-200 px-3 py-2 text-left">送信</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-slate-200 px-3 py-2">問い合わせ受信時</td><td className="border border-slate-200 px-3 py-2">問い合わせ者</td><td className="border border-slate-200 px-3 py-2">お問い合わせありがとうございます（申込みフォーム案内）</td><td className="border border-slate-200 px-3 py-2">自動</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2">申請送信時</td><td className="border border-slate-200 px-3 py-2">申請者</td><td className="border border-slate-200 px-3 py-2">卸取引のお申込みを受け付けました</td><td className="border border-slate-200 px-3 py-2">自動</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2">申請送信時</td><td className="border border-slate-200 px-3 py-2">スタッフ</td><td className="border border-slate-200 px-3 py-2">【ショップ審査】新規申込み: ○○様</td><td className="border border-slate-200 px-3 py-2">自動</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2">承認時</td><td className="border border-slate-200 px-3 py-2">申請者</td><td className="border border-slate-200 px-3 py-2">審査結果のご連絡（ご登録のご案内）＋登録リンク</td><td className="border border-slate-200 px-3 py-2">自動</td></tr>
              <tr><td className="border border-slate-200 px-3 py-2">否決時</td><td className="border border-slate-200 px-3 py-2">申請者</td><td className="border border-slate-200 px-3 py-2">審査結果のご連絡（お断り）</td><td className="border border-slate-200 px-3 py-2"><b>チェックした時のみ</b></td></tr>
              <tr><td className="border border-slate-200 px-3 py-2">リンク再発行時</td><td className="border border-slate-200 px-3 py-2">申請者</td><td className="border border-slate-200 px-3 py-2">ご登録リンクの再発行のご案内</td><td className="border border-slate-200 px-3 py-2">自動</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-slate-600 text-xs">
          申請者向けメールの送信元は <code className="bg-slate-100 px-1 rounded">noreply@torecacorp.jp</code> ですが、返信はすべて卸担当（河津）に届く設定です。
        </p>
      </section>

      <section className="card p-5 sm:p-6 space-y-3">
        <h2 className="font-bold text-lg">よくある質問</h2>
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">Q. 間違えて承認してしまった</dt>
            <dd className="text-slate-600 ml-0">ショップ様が登録リンクを使う前なら、「顧客管理 → 招待リンク」で該当リンクを「失効」させれば登録できなくなります。すでに登録済みの場合は「顧客管理」でそのショップを停止してください。</dd>
          </div>
          <div>
            <dt className="font-semibold">Q. 間違えて却下してしまった</dt>
            <dd className="text-slate-600 ml-0">却下は取り消せません。申請者に改めて申込みフォームから再申請してもらってください（同じメールアドレスで再申請できます）。</dd>
          </div>
          <div>
            <dt className="font-semibold">Q. 同じ人から申請が2件来ている</dt>
            <dd className="text-slate-600 ml-0">30日以内の同一メールアドレスからの重複申請はシステム側で弾いていますが、別アドレスの場合は届きます。片方を承認し、もう片方は審査メモに「重複」と書いて却下（お断りメールは送らない）してください。</dd>
          </div>
          <div>
            <dt className="font-semibold">Q. 申請者から「メールが届かない」と言われた</dt>
            <dd className="text-slate-600 ml-0">迷惑メールフォルダの確認を依頼してください。それでも届かない場合は「承認済み」タブの「登録リンクを再送…」で再送できます。</dd>
          </div>
        </dl>
      </section>

      <p className="text-xs text-slate-400">
        新規審査の基準（実店舗必須・運営歴・ティア構造）の背景は <Link href="/admin/manual/onboarding" className="text-brand-600 underline">新人研修マニュアル</Link> を参照。
      </p>
    </div>
  );
}
