// お知らせ管理 (admin): 先行公開の状況・全体へのお知らせ・新商品メール・タイトル管理への導線
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { listTesterShops, NOTICES_ROLLOUT_AT, NOTICES_TESTER_START } from "@/lib/feature-flags";
import { AnnouncementsManager } from "./AnnouncementsManager";
import { DigestTester } from "./DigestTester";

export const dynamic = "force-dynamic";
export const metadata = { title: "お知らせ管理 | 管理" };

export default async function NoticesAdminPage() {
  const supabase = createClient();
  const testerMap = await listTesterShops(createAdminClient());
  const [{ data: testerRows }, { data: anns }, { data: logs }] = await Promise.all([
    testerMap.size
      ? supabase.from("shops").select("id, company_name").in("id", [...testerMap.keys()]).order("company_name")
      : Promise.resolve({ data: [] as { id: string; company_name: string }[] }),
    supabase.from("announcements").select("id, title, body, link_url, created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
    supabase.from("batch_logs").select("status, processed_count, error_count, error_detail, started_at").eq("batch_name", "new-product-digest").order("started_at", { ascending: false }).limit(5),
  ]);
  const testers = (testerRows ?? []).map((t) => ({ ...t, reason: testerMap.get(t.id) }));
  const rolledOut = !!NOTICES_ROLLOUT_AT;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">お知らせ管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          お客様のアプリ内「お知らせ」（全体へのお知らせ / あなたへのお知らせ）と、新商品のまとめメール（毎日10:00）の管理です。
        </p>
      </div>

      <section className={`rounded-xl border p-4 text-sm ${rolledOut ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
        {rolledOut ? (
          <p className="font-semibold text-emerald-800">お知らせ機能は全てのお客様に公開中です。</p>
        ) : (
          <>
            <p className="font-semibold text-amber-900">🧪 お知らせ機能は現在「テストユーザー」のお客様にだけ表示されています（新商品メールもテストユーザーにだけ送信）。</p>
            <p className="text-amber-900 mt-1">テストユーザー: {testers.length === 0 ? "なし" : testers.map((t) => (
              <Link key={t.id} href={`/admin/shops/${t.id}`} className="underline mr-2">
                {t.company_name}{t.reason === "staff" ? "（スタッフ）" : ""}
              </Link>
            ))}</p>
            <p className="text-xs text-amber-800 mt-1">
              <b>スタッフのメールアドレス（「+」付きの別名も可。例: m.kawazu+shop@torecacorp.jp）で作ったショップは自動でテストユーザー</b>になります。
              それ以外は 顧客管理 → お客様の詳細 →「テストユーザー」で個別に追加できます。全体への公開は開発担当に依頼してください。
            </p>
            <p className="text-xs text-amber-800 mt-1">
              ※ お知らせの対象は、テストユーザーは {new Date(NOTICES_TESTER_START).toLocaleString("ja-JP")} 以降、全体は全体反映した時刻以降に公開された商品・お知らせだけです（それより前の分は通知しません）。
            </p>
          </>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">タイトル管理（ポケモン / ワンピース / ヴァイス …）</h2>
          <Link href="/admin/notices/titles" className="btn-secondary text-xs">タイトル管理を開く</Link>
        </div>
        <p className="text-xs text-slate-500">新商品のお知らせをお客様がタイトル単位で選べるようにするための括りです。商品のシリーズ名をキーワードで自動分類し、未登録のシリーズは自動でタイトルに追加されます。</p>
      </section>

      <AnnouncementsManager
        items={(anns ?? []).map((a) => ({ id: a.id, title: a.title, body: a.body, linkUrl: a.link_url, createdAt: formatJST(a.created_at) }))}
      />

      <DigestTester testers={testers.map((t) => ({ id: t.id, name: t.company_name }))} />

      <section className="card p-5 space-y-2">
        <h2 className="font-semibold text-sm">新商品メールの送信履歴（直近5回）</h2>
        {(logs ?? []).length === 0 ? <p className="text-xs text-slate-500">まだ実行されていません</p> : (
          <ul className="text-xs space-y-1">
            {(logs ?? []).map((l) => (
              <li key={l.started_at} className={l.status === "success" ? "text-slate-600" : "text-rose-700"}>
                {formatJST(l.started_at)} ・ 対象 {l.processed_count} 社 ・ {l.status === "success" ? "成功" : l.status === "partial" ? `一部失敗 (${l.error_count})` : "失敗"}
                {l.error_detail && <span className="block text-rose-600">{l.error_detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
