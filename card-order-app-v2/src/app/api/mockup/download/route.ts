// モックアップ HTML を Content-Disposition: attachment で配信 (右クリック不要で DL)
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "mockup.html");
  const buf = await readFile(filePath);
  const filename = `torecacorp-mockup-${new Date().toISOString().slice(0, 10)}.html`;
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
