// 購入履歴 (アプリ運用以前) 一括取込テンプレートのダウンロード (admin)
// 列定義は lib/legacy-purchases.ts と共通なので、取込側とずれない。
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { LEGACY_DATA_SHEET, LEGACY_MAX_ROWS, LEGACY_TEMPLATE_COLUMNS } from "@/lib/legacy-purchases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const wb = XLSX.utils.book_new();

  // 入力シート: 見出し行のみ (記入例は別シート。例がそのまま取り込まれる事故を防ぐ)
  const data = XLSX.utils.aoa_to_sheet([LEGACY_TEMPLATE_COLUMNS.map((c) => c.header)]);
  data["!cols"] = LEGACY_TEMPLATE_COLUMNS.map((c) => ({ wch: c.key === "productName" ? 44 : c.key.endsWith("ote") ? 28 : 14 }));
  XLSX.utils.book_append_sheet(wb, data, LEGACY_DATA_SHEET);

  const guide = XLSX.utils.aoa_to_sheet([
    ["列", "見出し", "必須", "入力ルール", "記入例"],
    ...LEGACY_TEMPLATE_COLUMNS.map((c, i) => [String.fromCharCode(65 + i), c.header, c.required ? "必須" : "任意", c.help, c.example]),
    [],
    ["注意"],
    [`・「${LEGACY_DATA_SHEET}」シートの2行目から入力してください。見出し行(1行目)は変更・削除しないでください`],
    ["・列の追加・並べ替え・見出しの書き換えをすると取り込めません"],
    ["・金額はすべて税抜です"],
    [`・1回に取り込めるのは ${LEGACY_MAX_ROWS} 行までです`],
    ["・取込時は確認画面で内容をチェックしてから確定します。エラーが1行でもあると登録できません"],
  ]);
  guide["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 6 }, { wch: 46 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, guide, "記入例・ルール");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("購入履歴_取込テンプレート.xlsx")}`,
    },
  });
}
